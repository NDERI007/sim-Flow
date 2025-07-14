import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { FlowProducer } from 'bullmq';
import { fetchGroupContacts } from '../../lib/fetchContacts/fetchgroup';
import { validateCronSecret } from '../../lib/validateCRON';
import { prepareRecipients } from '../../lib/prepareRE/receipients';

const connection = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null,
});
const flowProducer = new FlowProducer({ connection });
const BATCH_SIZE = 500;

export async function GET(req: Request) {
  const TIMEOUT_MS = 20_000;
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
    const { data: messages, error } = await supabase
      .rpc('check_scheduled_messages')
      .abortSignal(controller.signal);

    if (error) {
      console.error('❌ RPC failed:', error.message);
      return NextResponse.json(
        { message: 'Failed to fetch scheduled messages' },
        { status: 500 },
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ message: 'No scheduled messages found' });
    }

    let processed = 0;

    for (const msg of messages) {
      const { id, user_id, message, to_number = [], contact_group_ids } = msg;

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

      if (totalRecipients === 0 || allPhones.length === 0) {
        console.warn('⚠️ No recipients found for message', { id });
        continue;
      }

      const contact_map: Record<string, string | null> = {};
      groupContacts.forEach((c) => (contact_map[c.phone] = c.id));
      to_number.forEach((num: string) => (contact_map[num] = null));

      const phoneBatches = [];
      for (let i = 0; i < allPhones.length; i += BATCH_SIZE) {
        phoneBatches.push(allPhones.slice(i, i + BATCH_SIZE));
      }

      try {
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
            p_amount: totalSegments,
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
      } catch (err) {
        console.error('❌ Error processing message:', {
          id,
          error: err instanceof Error ? err.message : err,
        });
        continue;
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
