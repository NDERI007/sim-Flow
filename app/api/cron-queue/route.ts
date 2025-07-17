import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { FlowProducer } from 'bullmq';
import { fetchGroupContacts } from '../../lib/fetchContacts/fetchgroup';
import { validateCronSecret } from '../../lib/validateCRON';
import { prepareRecipients } from '../../lib/prepareRE/receipients';
import { notifyQuotaFailure } from '../../lib/Notify/QuotaLow';

const connection = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null,
});
const flowProducer = new FlowProducer({ connection });
const BATCH_SIZE = 500;

type ScheduledMessage = {
  id: string;
  user_id: string;
  message: string;
  to_number: string[] | null;
  scheduled_at: string; // or `Date` if you parse it
  contact_group_ids: string[]; // aggregated from message_contacts
  _segments?: number;
  _recipients?: {
    allPhones: string[];
    totalRecipients: number;
    segmentsPerMessage: number;
  };
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
    const { data: userRows, error: userError } = await supabase
      .from('messages')
      .select('user_id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .neq('user_id', null)
      .abortSignal(controller.signal);

    if (userError) {
      console.error('❌ Failed to fetch userIds:', userError.message);
      return NextResponse.json(
        { message: 'Failed to fetch user IDs' },
        { status: 500 },
      );
    }

    const userIds = [...new Set((userRows ?? []).map((row) => row.user_id))];
    if (userIds.length === 0) {
      return NextResponse.json({ message: 'No scheduled messages found' });
    }

    let allMessages: ScheduledMessage[] = [];
    for (const user_id of userIds) {
      const { data: messages, error: msgError } = await supabase
        .rpc('get_scheduled_messages', { p_user_id: user_id })
        .abortSignal(controller.signal);

      if (msgError) {
        console.error(`❌ RPC failed for user ${user_id}:`, msgError.message);
        continue;
      }

      allMessages.push(...(messages || []));
    }

    // 1. Group messages by user_id
    const messageMap: Record<string, ScheduledMessage[]> = {};
    const totalSegmentsPerUser: Record<string, number> = {};

    for (const msg of allMessages) {
      const {
        id,
        user_id,
        message,
        to_number = [],
        contact_group_ids = [],
      } = msg;

      let groupContacts = [];
      if (contact_group_ids.length > 0) {
        try {
          groupContacts = await fetchGroupContacts(contact_group_ids);
        } catch (err) {
          console.error('❌ Failed to fetch group contacts:', {
            id,
            error: err,
          });
          continue;
        }
      }

      const { allPhones, totalSegments, totalRecipients, segmentsPerMessage } =
        prepareRecipients({
          manualNumbers: to_number,
          groupContacts,
          message,
          devMode: true,
        });

      if (!messageMap[user_id]) {
        messageMap[user_id] = [];
        totalSegmentsPerUser[user_id] = 0;
      }

      msg._recipients = { allPhones, totalRecipients, segmentsPerMessage };
      msg._segments = totalSegments;

      totalSegmentsPerUser[user_id] += totalSegments;
      messageMap[user_id].push(msg);
    }

    // 2. Run quota check for each user
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

    let processed = 0;
    for (const [user_id, userMessages] of Object.entries(messageMap)) {
      const quotaResult = quotaMap.get(user_id);
      if (!quotaResult?.has_quota) continue;

      for (const msg of userMessages) {
        const {
          id,
          message,
          contact_group_ids = [],
          to_number = [],
          _segments,
          _recipients,
        } = msg;

        const { allPhones, totalRecipients, segmentsPerMessage } = _recipients;

        if (totalRecipients === 0 || allPhones.length === 0) {
          console.warn('⚠️ No recipients found for message', { id });
          continue;
        }

        const contact_map = {};
        const groupContacts = await fetchGroupContacts(contact_group_ids);
        groupContacts.forEach((c) => (contact_map[c.phone] = c.id));
        to_number.forEach((num) => (contact_map[num] = null));

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
            metadata: {
              source: 'cron',
              scheduled: true,
            },
          },
          opts: {
            jobId: `flow-${id}`,
            removeOnComplete: true,
          },
          children: phoneBatches.map((batch, i) => ({
            name: 'send_sms_batch',
            queueName: 'smsQueue',
            data: {
              message_id: id,
              message,
              to_number: batch,
              contact_map,
              segmentsPerMessage,
              metadata: {
                source: 'cron',
                batchIndex: i,
              },
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
      error: err instanceof Error ? err.message : err,
    });
    return NextResponse.json(
      { message: 'Cron job failed', error: String(err) },
      { status: 500 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
