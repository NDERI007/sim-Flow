import { Worker, UnrecoverableError } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import dotenv from 'dotenv';
import { sendSmsOnfon } from './lib/onfon.js';
import { notifyAdmin } from './lib/QuotaFailure.js';

dotenv.config();

// Redis & Supabase setup
const redis = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null,
});
redis.ping().then(console.log).catch(console.error);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
type InstantSmsJob = {
  message_id: string;
  message: string;
  to_number: string[];
  contact_map: Record<string, string>;
  segmentsPerMessage: number;
};

type SmsJobData = InstantSmsJob;

async function handleInstantJob(data: InstantSmsJob) {
  const { message_id, message, to_number, contact_map } = data;

  // Fetch sender_id via messages → users join
  // Get message and user_id
  const { data: messageRow, error: messageError } = await supabase
    .from('messages')
    .select('user_id')
    .eq('id', message_id)
    .single();

  if (messageError || !messageRow) throw new Error('MISSING_MESSAGE_USER');

  // Then get sender_id
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('sender_id')
    .eq('id', messageRow.user_id)
    .single();

  if (userError || !userRow?.sender_id) throw new Error('MISSING_SENDER_ID');

  const sender_id = userRow.sender_id;

  const results = await sendSmsOnfon(to_number, message, sender_id);

  // Upsert into message_contacts
  const inserts = results.map((res) => ({
    message_id,
    contact_id: contact_map[res.phone],
    status: res.status,
    to_number: res.phone,
    error_code: res.status === 'failed' ? res.code : null,

    error: res.status === 'failed' ? res.message : null,
  }));

  const { error: insertError } = await supabase
    .from('message_contacts')
    .upsert(inserts, { onConflict: 'message_id,contact_id' });

  if (insertError) {
    console.error('Failed to upsert message_contacts:', insertError);
    throw new Error('FAILED_DB_INSERT');
  }

  const hasFailed = results.some((r) => r.status === 'failed');

  if (hasFailed) {
    const hasNonRetriable = results.some(
      (r) => r.status === 'failed' && r.type === 'NON_RETRIABLE',
    );
    const allFailed = results.every((r) => r.status === 'failed');

    if (allFailed && hasNonRetriable)
      throw new UnrecoverableError(`NON_RETRIABLE_ALL`);
    if (allFailed) throw new Error(`RETRIABLE_ALL`);
  }

  // Mark parent message as sent
  await supabase
    .from('messages')
    .update({
      status: 'sent',
      sent_at: DateTime.now().setZone('Africa/Nairobi').toISO(),
    })
    .eq('id', message_id)
    .in('status', ['queued', 'scheduled']);

  return { ok: true };
}

// Worker logic
export const smsWorker = new Worker(
  'smsQueue',
  async (job) => {
    const data = job.data as SmsJobData;
    if (
      !Array.isArray(job.data?.to_number) ||
      job.data.to_number.length === 0
    ) {
      console.log(`🔃 Skipping parent job: ${job.name}`);
      return;
    }

    return await handleInstantJob(data);
  },

  {
    connection: redis,
    concurrency: 5, //The maximum number of jobs that the worker can process in parallel.
  },
);

// Worker Events
smsWorker.on('completed', (job) => {
  const id = job.data.message_id ?? job.data.job_id;

  console.log(`Job ${job.name} [${id}] completed`);
});

smsWorker.on('failed', async (job, err) => {
  if (!job) return;

  await notifyAdmin({
    subject: `SMS Worker Job Failed: ${job.id}`,
    body: `
    <p>Error encountered before retries were evaluated.</p>
    <p><strong>Error:</strong> ${err.message}</p>
    <p><strong>Job Data:</strong> ${JSON.stringify(job.data)}</p>
  `,
  });

  console.error(`Job ${job.id} failed:`, err.message);

  const isRetriable =
    err.message.startsWith('RETRIABLE') || err.message === 'TIMEOUT';
  const finalTry = job.attemptsMade + 1 >= (job.opts.attempts || 1);

  const segments = job.data.segmentsPerMessage || 1;

  // Always fetch user_id from messages
  const { data: msgData, error: msgErr } = await supabase
    .from('messages')
    .select('user_id')
    .eq('id', job.data.message_id)
    .single();

  if (msgErr || !msgData) {
    console.error(
      'Could not fetch user_id for message:',
      job.data.message_id,
      msgErr?.message,
    );
    return;
  }

  const user_id = msgData?.user_id;

  if (!isRetriable || finalTry) {
    await supabase
      .from('messages')
      .update({
        status: 'failed',
        failed_at: DateTime.now().setZone('Africa/Nairobi').toISO(),
        error: err.message,
      })
      .eq('id', job.data.message_id);
  }

  const { data: failedContacts, error: fetchFailedError } = await supabase
    .from('message_contacts')
    .select('contact_id, error_code')
    .eq('message_id', job.data.message_id)
    .eq('status', 'failed')
    .in('to_number', job.data.to_number ?? []);

  if (fetchFailedError) {
    console.error(
      'Could not fetch failed recipients:',
      fetchFailedError.message,
    );
    return;
  }

  const nonRetriableCodes = new Set([
    '007',
    '008',
    '009',
    '010',
    '011',
    '013',
    '015',
    '019',
    '020',
    '021',
    '023',
    '024',
    '028',
    '029',
    '030',
    '031',
    '039',
    '042',
    '801',
    '803',
    '804',
    '805',
    '807',
    '808',
    '809',
  ]);

  const nonRetriableContacts = (failedContacts ?? []).filter((c) =>
    nonRetriableCodes.has(String(c.error_code)),
  );

  if (nonRetriableContacts.length > 0 && user_id) {
    const refundAmount = nonRetriableContacts.length * segments;

    const { error: refundError } = await supabase.rpc('refund_quota_and_log', {
      uid: user_id,
      amount: refundAmount,
      reason: 'non_retriable_failed',
      related_id: job.data.message_id,
    });

    if (refundError) {
      console.error('Quota refund failed:', refundError.message);
      await notifyAdmin({
        subject: 'Quota refund Failed',
        body: `
                  <p>User ID: ${user_id}</p>
                  <p>RefundAmount: ${refundAmount}
                  <p>Message: ${job.data.message}
                  <p>Error: ${refundError.message}</p>
                `,
      });
    } else {
      console.log(
        `Refunded quota for ${nonRetriableContacts.length} non-retriable failed recipients.`,
      );
    }
  }
});

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('Shutting down gracefully...');
  try {
    await smsWorker.close();
  } catch (e) {
    console.error('Error during shutdown:', e);
  }
  process.exit(0);
}
