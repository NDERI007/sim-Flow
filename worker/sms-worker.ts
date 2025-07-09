import { Worker, UnrecoverableError, Job } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis(process.env.REDIS_URL!, { tls: {} });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type ParsedError = {
  message: string;
  code: string;
  type: 'RETRIABLE' | 'NON_RETRIABLE' | 'UNKNOWN';
};

const classifyError = (code: string): ParsedError['type'] => {
  const nonRetriable = new Set([
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

  const retriable = new Set(['006', '033', '034']);

  if (retriable.has(code)) return 'RETRIABLE';
  if (nonRetriable.has(code)) return 'NON_RETRIABLE';
  return 'UNKNOWN';
};

const parseError = (err: unknown): ParsedError => {
  if (err instanceof Error && err.message === 'TIMEOUT') {
    return { message: 'Timeout', code: 'TIMEOUT', type: 'RETRIABLE' };
  }

  if (axios.isAxiosError(err)) {
    const code = err.response?.data?.code ?? 'AXIOS_ERR';
    const message =
      err.response?.data?.message ?? err.message ?? 'Unknown Axios error';

    return {
      code,
      message,
      type: classifyError(code),
    };
  }

  if (typeof err === 'object' && err !== null) {
    const maybeErr = err as { code?: string; message?: string };
    const code = maybeErr.code ?? 'UNKNOWN';
    const message = maybeErr.message ?? 'Unknown structured error';
    return {
      code,
      message,
      type: classifyError(code),
    };
  }

  return {
    code: 'UNKNOWN',
    message: String(err),
    type: 'UNKNOWN',
  };
};

// -- Send SMS --
async function sendSmsOnfon(to: string[], message: string, sender_id: string) {
  const ONFON_ENDPOINT = 'https://api.onfonmedia.co.ke/v1/sms/SendBulkSMS';
  const payload = {
    SenderId: sender_id,
    ApiKey: process.env.ONFON_ACCESS_KEY,
    ClientId: process.env.ONFON_CLIENT_ID,
    MessageParameters: to.map((n) => ({ Number: n, Text: message })),
  };

  try {
    const res = await axios.post(ONFON_ENDPOINT, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    const recipients = res.data?.recipients;
    if (!recipients || !Array.isArray(recipients)) {
      throw new Error('Malformed Onfon response');
    }

    return recipients.map((r: any) => ({
      phone: r.Number,
      status: r.Code === '000' ? 'success' : 'failed',
      code: r.Code,
      message: r.Message || 'No message',
      type: classifyError(r.Code),
    }));
  } catch (err) {
    const parsed = parseError(err);
    return to.map((phone) => ({
      phone,
      status: 'failed',
      code: parsed.code,
      message: parsed.message,
      type: parsed.type,
    }));
  }
}

// -- Worker Logic --
export const smsWorker = new Worker(
  'smsQueue',
  async (job) => {
    const {
      message_id,
      message,
      to_number,
      contact_map,
      segmentsPerMessage,
      user_id,
    } = job.data;

    // Get sender ID
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('sender_id')
      .eq('id', user_id)
      .single();

    if (!user || !user.sender_id || userErr)
      throw new Error('MISSING_SENDER_ID');

    const results = await sendSmsOnfon(to_number, message, user.sender_id);

    // Prepare inserts for message_contacts
    const inserts = results.map((res) => ({
      message_id,
      contact_id: contact_map[res.phone],
      status: res.status,
      error: res.status === 'failed' ? res.message : null,
    }));

    const { error: insertError } = await supabase
      .from('message_contacts')
      .upsert(inserts, { onConflict: 'message_id,contact_id' });

    if (insertError) {
      throw new Error('FAILED_DB_INSERT');
    }

    const hasFailed = results.some((r) => r.status === 'failed');

    if (hasFailed) {
      const hasNonRetriable = results.some(
        (r) => r.status === 'failed' && r.type === 'NON_RETRIABLE',
      );
      const allFailed = results.every((r) => r.status === 'failed');

      if (allFailed && hasNonRetriable) {
        // All recipients failed and at least one was non-retriable
        throw new UnrecoverableError(`NON_RETRIABLE_ALL`);
      }

      if (allFailed) {
        // All failed but may be retriable
        throw new Error(`RETRIABLE_ALL`);
      }

      // Partial failure — success + failure mixed.
      // We can choose to:
      // - not throw (consider job complete)
      // - or mark as partial for manual review
      // For now, we’ll continue.
    }

    // Update parent if all succeeded
    await supabase
      .from('messages')
      .update({
        status: 'sent',
        sent_at: DateTime.now().setZone('Africa/Nairobi').toISO(),
      })
      .eq('id', message_id)
      .eq('status', 'queued');

    // Update parent if all succeeded
    await supabase
      .from('messages')
      .update({
        status: 'sent',
        sent_at: DateTime.now().setZone('Africa/Nairobi').toISO(),
      })
      .eq('id', message_id)
      .eq('status', ['queued', 'scheduled']);

    const quotaToDeduct = to_number.length * segmentsPerMessage;

    //  Deduct quota once (safe via RPC)
    const { error: quotaError } = await supabase.rpc('deduct_quota_and_log', {
      uid: user_id,
      amount: quotaToDeduct, // 1 per recipient
      reason: 'send_sms',
      related_msg_id: message_id,
    });

    if (quotaError) {
      console.warn(
        'Quota not deducted. Check if already done or insufficient:',
        {
          user_id,
          message_id,
          count: to_number.length,
          error: quotaError.message,
        },
      );
    }

    return { ok: true };
  },
  {
    connection: redis,
    concurrency: 5,
  },
);

// -- Events --
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
  // Mark parent message as failed if it's a final unretriable failure
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

  // 🔁 Refund quota only for failed recipients (after all retries)
  if (finalTry) {
    const { data: failedContacts, error: fetchFailedError } = await supabase
      .from('message_contacts')
      .select('contact_id')
      .eq('message_id', job.data.message_id)
      .eq('status', 'failed');

    if (fetchFailedError) {
      console.error(
        '❌ Could not count failed recipients for quota refund:',
        fetchFailedError.message,
      );
      return;
    }

    const failedCount = failedContacts?.length ?? 0;

    if (failedCount > 0) {
      const { error: refundError } = await supabase.rpc(
        'refund_quota_and_log',
        {
          uid: job.data.user_id,
          amount: refundAmount,
          reason: 'retries_exhausted',
          related_id: job.data.message_id,
        },
      );

      if (refundError) {
        console.error('⚠️ Failed to refund quota:', refundError.message);
      } else {
        console.log(`💰 Refunded quota for ${failedCount} failed recipients.`);
      }
    }
  }
});
