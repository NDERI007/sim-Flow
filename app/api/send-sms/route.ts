import { NextResponse, type NextRequest } from 'next/server';
import Redis from 'ioredis';
import { FlowProducer, Queue } from 'bullmq';
import { prepareRecipients } from '../../lib/prepareRE/receipients';
import { fetchGroupContacts } from '../../lib/fetchContacts/fetchgroup';
import {
  insertMessage,
  type MessageRow,
} from '../../lib/Insert-link/contact-link';
import { ServerClient } from '../../lib/supabase/serverClient';
import { DateTime } from 'luxon';
import { treeifyError, ZodError } from 'zod';
import { validateInput } from '../../lib/validation/inputV';
import { sendSmsSchema } from '../../lib/schema/sendSms';
import { notifyAdmin } from '../../lib/Notify/QuotaFailure';

// Redis & BullMQ setup
const connection = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null,
});
const flowProducer = new FlowProducer({ connection });
const smsQueue = new Queue('smsQueue', { connection });

const BATCH_SIZE = 500;

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = ServerClient(req, res);
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Failed to validate', { error, user });
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rawbody = await req.json();
    console.log('📦 Backend received:', rawbody);
    const { data: parsed, error: validationErr } = await validateInput(
      sendSmsSchema,
      rawbody,
    );
    if (validationErr) return validationErr;

    const {
      to_number = [],
      message,
      scheduledAt,
      contact_group_ids = [],
    } = parsed;

    let groupContacts = [];
    if (Array.isArray(contact_group_ids) && contact_group_ids.length > 0) {
      try {
        groupContacts = await fetchGroupContacts(supabase, contact_group_ids);
      } catch (err) {
        console.error('❌ fetchGroupContacts failed:', {
          error: err instanceof Error ? err.message : err,
          stack: err instanceof Error ? err.stack : null,
          contact_group_ids,
        });
        return NextResponse.json(
          {
            message: 'Failed to fetch contacts',
            error: err instanceof Error ? err.message : String(err),
          },
          { status: 500 },
        );
      }
    }

    let allPhones: string[] = [];
    let totalRecipients = 0;
    let totalSegments = 0;
    let segmentsPerMessage = 0;
    try {
      const result = prepareRecipients({
        manualNumbers: to_number,
        groupContacts,
        message,
        devMode: true,
      });

      allPhones = result.allPhones;
      totalRecipients = result.totalRecipients;
      totalSegments = result.totalSegments;
      segmentsPerMessage = result.segmentsPerMessage;
    } catch (err) {
      if (err instanceof ZodError) {
        const tree = treeifyError(err);
        console.warn(' Zod validation failed in prepareRecipients:');

        return NextResponse.json(
          {
            message: 'Invalid input for recipients.',
            issues: tree, // Contains detailed form-like errors
          },
          { status: 400 },
        );
      }

      console.error('❌ prepareRecipients failed:', {
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : null,
      });

      return NextResponse.json(
        {
          message: 'Invalid recipient input or message',
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 400 },
      );
    }

    // Step 1: Check quota before inserting message or queuing jobs
    const { data: quotaData, error: quotaError } = await supabase.rpc(
      'quota_check',
      {
        p_uid: user.id,
        p_amount: totalSegments,
      },
    );

    const quotaResult = quotaData?.[0];

    if (quotaError || !quotaResult?.has_quota) {
      console.warn('❌ Insufficient quota or RPC failed:', {
        quotaError,
        quotaResult,
      });
      await notifyAdmin({
        subject: 'Quota Check Failed',
        body: `
          <p>User ID: ${user.id}</p>
          <p>Quota Result: ${quotaResult}
          <p>Error: ${quotaError.message}</p>
        `,
      });

      return NextResponse.json(
        {
          message: quotaResult?.reason || 'Insufficient quota',
          available: quotaResult?.available ?? null,
          required: quotaResult?.required ?? totalSegments,
        },
        { status: 403 },
      );
    }

    console.log('✅ Recipients prepared:', {
      totalRecipients,
      totalSegments,
      hasPhones: allPhones.length > 0,
    });

    if (totalRecipients === 0) {
      console.warn('⚠️ No valid recipients found');
      return NextResponse.json(
        { message: 'No valid recipients found.' },
        { status: 400 },
      );
    }

    let messageRow: MessageRow;
    try {
      messageRow = await insertMessage({
        supabase,
        user_id: user.id,
        message,
        scheduledAt,
        groupContacts,
        to_number,
      });
      console.log('✅ Message inserted with ID:', messageRow.id);
    } catch (err) {
      console.error('❌ insertMessage failed:', {
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : null,
        inputs: {
          message,
          scheduledAt,
          groupContacts,
          to_number,
          user_id: user.id,
        },
      });
      return NextResponse.json(
        { message: (err as Error).message ?? 'Failed to insert message' },
        { status: 500 },
      );
    }

    const phoneBatches = [];
    for (let i = 0; i < allPhones.length; i += BATCH_SIZE) {
      phoneBatches.push(allPhones.slice(i, i + BATCH_SIZE));
    }
    // STEP 2: Create contact_map: phone -> contact_id | null
    const contact_map: Record<string, string | null> = {};

    // From groupContacts
    for (const contact of groupContacts ?? []) {
      if (contact.phone) {
        contact_map[contact.phone] = contact.id;
      }
    }

    // From manualNumbers
    for (const number of to_number ?? []) {
      contact_map[number] = null;
    }

    function parseLocalTime(input: string): Date {
      return DateTime.fromFormat(input, "yyyy-MM-dd'T'HH:mm", {
        zone: 'Africa/Nairobi',
      }).toJSDate();
    }

    const isScheduled = scheduledAt && parseLocalTime(scheduledAt) > new Date();
    let cappedDelay = 0;

    if (isScheduled) {
      const delayMs = parseLocalTime(scheduledAt).getTime() - Date.now();
      const maxDelay = 1000 * 60 * 60 * 24 * 2; // 2 days in ms
      console.log(
        'Parsed Nairobi Time:',
        DateTime.fromJSDate(parseLocalTime(scheduledAt)).toISO(),
      );
      console.log('Now:', DateTime.now().setZone('Africa/Nairobi').toISO());

      if (delayMs > maxDelay) {
        return NextResponse.json(
          { message: 'Scheduled time cannot exceed 2 days from now.' },
          { status: 400 },
        );
      }

      cappedDelay = Math.max(0, delayMs);
    }

    try {
      if (phoneBatches.length > 0) {
        await smsQueue.remove(`flow-${messageRow.id}`);
        for (let i = 0; i < phoneBatches.length; i++) {
          await smsQueue.remove(`sms-${messageRow.id}-batch-${i}`);
        }

        await flowProducer.add({
          name: `send_sms_flow_${messageRow.id}`,
          queueName: 'smsQueue',
          data: {
            message_id: messageRow.id,
            totalRecipients,
            metadata: {
              source: 'dashboard',
            },
          },
          opts: {
            jobId: `flow-${messageRow.id}`,
            attempts: 1,
            removeOnComplete: true,
          },
          children: phoneBatches.map((batch, i) => ({
            name: 'send_sms_batch',
            queueName: 'smsQueue',
            data: {
              message_id: messageRow.id,
              message,
              to_number: batch,
              contact_map,
              segmentsPerMessage,
              metadata: {
                source: 'dashboard',
                batchIndex: i,
              },
            },
            opts: {
              jobId: `sms-${messageRow.id}-batch-${i}`,
              delay: cappedDelay + i * 1000, // Stagger if needed
              attempts: 3,
              backoff: { type: 'exponential', delay: 5000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          })),
        });

        const { error: quotaError } = await supabase.rpc(
          'deduct_quota_and_log',
          {
            p_uid: user.id,
            p_amount: totalSegments, // total across all batches
            p_reason: 'send_sms',
            p_related_msg_id: messageRow.id,
          },
        );

        if (quotaError) {
          console.warn('Quota not deducted:', {
            user_id: user.id,
            message_id: messageRow.id,
            error: quotaError.message,
          });
          await notifyAdmin({
            subject: 'Quota deduction Failed',
            body: `
          <p>User ID: ${user.id}</p>
          <p>Message ID: ${messageRow.id}
          <p>Message: ${messageRow.message}
          <p>Error: ${quotaError.message}</p>
        `,
          });
        }

        console.log('✅ Flow added to BullMQ:', {
          batches: phoneBatches.length,
        });
      }
    } catch (err) {
      console.error('❌ BullMQ flowProducer failed:', {
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : null,
      });
      return NextResponse.json(
        { message: 'Failed to queue jobs', error: String(err) },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      recipients: totalRecipients,
      scheduled: Boolean(scheduledAt),
      scheduledFor: scheduledAt ?? null,
      totalSegments,
    });
  } catch (err) {
    console.error('❌ Uncaught error in /api/send-sms:', {
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : null,
    });
    return NextResponse.json(
      {
        message: 'Internal Server Error',
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : null,
      },
      { status: 500 },
    );
  }
}
