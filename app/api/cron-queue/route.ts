import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { FlowProducer } from 'bullmq';
import { fetchGroupContacts } from '../../lib/fetchContacts/fetchgroup';
import { validateCronSecret } from '../../lib/validateCRON';
import { Contact, prepareRecipients } from '../../lib/prepareRE/receipients';
import { notifyQuotaFailure } from '../../lib/Notify/QuotaLow';

// Redis and BullMQ setup
const connection = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null,
});
const flowProducer = new FlowProducer({ connection });
const BATCH_SIZE = 500;

// Type definition for the data returned by our new RPC
type ScheduledMessage = {
  id: string;
  user_id: string;
  message: string;
  to_number: string[] | null;
  scheduled_at: string;
  contact_group_ids: string[] | null;
  // Internal properties added during processing
  _segments?: number;
  _recipients?: {
    allPhones: string[];
    totalRecipients: number;
    segmentsPerMessage: number;
  };
  // FIX: Add a place to store fetched contacts to avoid re-fetching
  _groupContacts?: Contact[];
};

export async function GET(req: Request) {
  const TIMEOUT_MS = 30_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  if (!validateCronSecret(req)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    },
  );

  try {
    const { data: allMessages, error: rpcError } = await supabase
      .rpc('get_all_due_messages')
      .abortSignal(controller.signal);

    if (rpcError) {
      console.error('❌ Failed to fetch due messages via RPC:', rpcError);
      return NextResponse.json(
        { message: 'Failed to fetch scheduled messages' },
        { status: 500 },
      );
    }

    if (!allMessages || allMessages.length === 0) {
      return NextResponse.json({ message: 'No scheduled messages found' });
    }

    const messageMap: Record<string, ScheduledMessage[]> = {};
    const totalSegmentsPerUser: Record<string, number> = {};

    // In your GET function inside the api/route.ts for the cron job

    for (const msg of allMessages) {
      // Use a try...catch block for each message to prevent one bad message from crashing the entire job.
      try {
        const { id, user_id, message } = msg;
        const to_number = msg.to_number ?? [];
        const contact_group_ids = msg.contact_group_ids ?? [];

        let groupContacts = [];
        if (Array.isArray(contact_group_ids) && contact_group_ids.length > 0) {
          groupContacts = (await fetchGroupContacts(contact_group_ids)) || [];
        }

        // --- START DEBUGGING BLOCK ---
        let preparedData;
        try {
          preparedData = prepareRecipients({
            manualNumbers: to_number,
            groupContacts,
            message,
            devMode: true,
          });
        } catch (err) {
          console.error(
            `❌ FATAL ERROR inside prepareRecipients for message ID: ${id}`,
            err,
          );
          // Skip this broken message and move to the next one
          continue;
        }
        // --- END DEBUGGING BLOCK ---

        const {
          allPhones,
          totalSegments,
          totalRecipients,
          segmentsPerMessage,
        } = preparedData;

        if (!messageMap[user_id]) {
          messageMap[user_id] = [];
          totalSegmentsPerUser[user_id] = 0;
        }

        msg._recipients = { allPhones, totalRecipients, segmentsPerMessage };
        msg._segments = totalSegments;
        msg._groupContacts = groupContacts;

        totalSegmentsPerUser[user_id] += totalSegments;
        messageMap[user_id].push(msg);
      } catch (loopError) {
        console.error(
          `❌ An unexpected error occurred while processing message: ${msg.id}`,
          loopError,
        );
        continue; // Ensure the main loop continues
      }
    }

    // 3. Run quota check for each user
    const quotaMap = new Map();
    for (const [user_id, totalSegments] of Object.entries(
      totalSegmentsPerUser,
    )) {
      const { data, error } = await supabase.rpc('quota_check', {
        p_uid: user_id,
        p_amount: totalSegments,
      });
      quotaMap.set(
        user_id,
        data?.[0] ?? {
          has_quota: false,
          available: 0,
          required: totalSegments,
          reason: 'Unknown error',
        },
      );
      if (error || !data?.[0]?.has_quota) {
        console.warn(
          `❌ User ${user_id} has insufficient quota:`,
          data?.[0] ?? error,
        );
        const { data: userInfo } = await supabase
          .from('users')
          .select('email')
          .eq('id', user_id)
          .single();
        if (userInfo?.email) {
          await notifyQuotaFailure({
            email: userInfo.email,
            messagePreview:
              messageMap[user_id]?.[0]?.message?.slice(0, 80) ?? '',
            availableQuota: data?.[0]?.available ?? 0,
            missingAmount: data?.[0]?.required ?? totalSegments,
          });
        }
      }
    }

    // 4. Process and queue messages for users who have sufficient quota
    let processed = 0;
    for (const [user_id, userMessages] of Object.entries(messageMap)) {
      const quotaResult = quotaMap.get(user_id);
      if (!quotaResult?.has_quota) continue;

      for (const msg of userMessages) {
        const { id, message, _segments, _recipients } = msg;

        // 1) Coerce both into real arrays:
        const manualList: string[] = Array.isArray(msg.to_number)
          ? msg.to_number
          : [];
        const groupList: Contact[] = Array.isArray(msg._groupContacts)
          ? msg._groupContacts
          : [];
        // FIX: Safe destructuring of _recipients, avoiding the risky '!'
        const { allPhones, totalRecipients, segmentsPerMessage } =
          _recipients || {};

        // FIX: Add null/undefined check for allPhones before accessing .length
        if (!totalRecipients || !allPhones || allPhones.length === 0) {
          console.warn('⚠️ No recipients found for message', { id });
          continue;
        }

        const contact_map: Record<string, string | null> = {};
        groupList.forEach((c) => (contact_map[c.phone] = c.id));
        manualList.forEach((num) => (contact_map[num] = null));

        const phoneBatches = [];
        for (let i = 0; i < allPhones.length; i += BATCH_SIZE) {
          phoneBatches.push(allPhones.slice(i, i + BATCH_SIZE));
        }

        await flowProducer.add({
          name: `send_sms_flow_${id}`,
          queueName: 'smsQueue',
          data: {
            message_id: id,
            totalRecipients,
            metadata: { source: 'cron', scheduled: true },
          },
          opts: { jobId: `flow-${id}`, removeOnComplete: true },
          children: phoneBatches.map((batch, i) => ({
            name: 'send_sms_batch',
            queueName: 'smsQueue',
            data: {
              message_id: id,
              message,
              to_number: batch,
              contact_map,
              segmentsPerMessage,
              metadata: { source: 'cron', batchIndex: i },
            },
            opts: {
              jobId: `sms-${id}-batch-${i}`,
              attempts: 1,
              backoff: { type: 'exponential', delay: 5000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          })),
        });

        const { error: quotaError } = await supabase.rpc(
          'deduct_quota_and_log',
          {
            p_uid: user_id,
            p_amount: _segments,
            p_reason: 'scheduled-send',
            p_related_msg_id: id,
          },
        );

        if (quotaError) {
          console.warn('❌ Quota deduction failed:', {
            id,
            user_id,
            error: quotaError.message,
          });
        }
        processed++;
      }
    }

    return NextResponse.json({ success: true, processed });
  } catch (err) {
    console.error('❌ Cron execution error:', {
      error: err instanceof Error ? err.message : String(err),
    });
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { message: 'Cron job timed out' },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { message: 'Cron job failed', error: String(err) },
      { status: 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
