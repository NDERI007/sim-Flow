import { Worker, UnrecoverableError } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import dotenv from 'dotenv';
import { sendSmsOnfon } from './lib/onfon.js';
import express from 'express';
import { validateCronSecret } from './lib/validateCRON.js';

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
};

type ScheduledSmsJob = {
  job_id: string;
  user_id: string;
  message: string;
  to_number: string[];
  contact_map: Record<string, string>;
};

type SmsJobData = InstantSmsJob | ScheduledSmsJob;

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

    error: res.status === 'failed' ? res.message : null,
  }));

  const { error: insertError } = await supabase
    .from('message_contacts')
    .upsert(inserts, { onConflict: 'message_id,contact_id' });

  if (insertError) {
    console.error('❌ Failed to upsert message_contacts:', insertError);
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

async function handleScheduledJob(data: ScheduledSmsJob) {
  const { job_id, user_id, message, to_number, contact_map } = data;

  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('sender_id')
    .eq('id', user_id)
    .single();
  if (userErr || !userRow?.sender_id) throw new Error('MISSING_SENDER_ID');

  const sender_id = userRow.sender_id;
  const results = await sendSmsOnfon(to_number, message, sender_id);

  for (const res of results) {
    await supabase
      .from('sms_send_job_item')
      .update({
        status: res.status === 'success' ? 'sent' : 'failed',
        sent_at: res.status === 'success' ? DateTime.now().toISO() : null,
        error: res.status === 'failed' ? res.message : null,
      })
      .eq('job_id', job_id)
      .eq('phone_number', contact_map[res.phone]);
  }

  const { data: remaining, error: checkErr } = await supabase
    .from('sms_send_job_item')
    .select('id')
    .eq('job_id', job_id)
    .in('status', ['pending', 'processing']);

  if (!remaining || remaining.length === 0) {
    await supabase
      .from('sms_send_job')
      .update({ status: 'sent', sent_at: DateTime.now().toISO() })
      .eq('id', job_id);
  }

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
    if ('job_id' in data) {
      return await handleScheduledJob(data);
    } else if ('message_id' in data) {
      return await handleInstantJob(data);
    }
  },
  {
    connection: redis,
    concurrency: 5, //The maximum number of jobs that the worker can process in parallel.
  },
);

// Worker Events
smsWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed:`, job.data.message_id);
});

smsWorker.on('failed', async (job, err) => {
  if (!job) return;

  console.error(`❌ Job ${job.id} failed:`, err.message);

  const isRetriable =
    err.message.startsWith('RETRIABLE') || err.message === 'TIMEOUT';
  const finalTry = job.attemptsMade + 1 >= (job.opts.attempts || 1);

  const to_number = job.data.to_number;
  const segments = job.data.segmentsPerMessage || 1;
  const refundAmount = to_number.length * segments;

  // Always fetch user_id from messages
  const { data: msgData, error: msgErr } = await supabase
    .from('messages')
    .select('user_id')
    .eq('id', job.data.message_id)
    .single();

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

  if (finalTry && user_id) {
    const { data: failedContacts, error: fetchFailedError } = await supabase
      .from('message_contacts')
      .select('contact_id')
      .eq('message_id', job.data.message_id)
      .eq('status', 'failed');

    if (fetchFailedError) {
      console.error(
        '❌ Could not fetch failed recipients:',
        fetchFailedError.message,
      );
      return;
    }

    const failedCount = failedContacts?.length ?? 0;

    if (failedCount > 0) {
      const { error: refundError } = await supabase.rpc(
        'refund_quota_and_log',
        {
          uid: user_id,
          amount: refundAmount,
          reason: 'retries_exhausted',
          related_id: job.data.message_id,
        },
      );

      if (refundError) {
        console.error('⚠️ Quota refund failed:', refundError.message);
      } else {
        console.log(`💰 Refunded quota for ${failedCount} failed recipients.`);
      }
    }
  }
});

// Worker Events
// ... (completed, failed events) ...

smsWorker.on('drained', async () => {
  console.log('📭 Queue is drained. Pausing worker...');
  try {
    await smsWorker.pause();
    console.log('✅ Worker paused successfully.');
  } catch (err) {
    console.error('❌ Failed to pause worker:', err);
  }
});

console.log('📡 SMS Worker is running...');

const app = express();

app.get('/ping', async (req, res) => {
  if (!validateCronSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await smsWorker.resume();
    console.log('▶️ Worker resumed by API call.');
    res.json({ ok: true, message: 'Worker resumed' });
  } catch (err) {
    console.error('❌ Failed to resume worker:', err);
    res.status(500).json({ error: 'Failed to resume worker' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Worker HTTP server listening on port ${PORT}`);
});
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('🛑 Shutting down gracefully...');
  await smsWorker.close();
  process.exit(0);
}
