import { UnrecoverableError, Worker } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const connection = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null,
});
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise
      .then((res) => {
        clearTimeout(id);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(id);
        reject(err);
      });
  });
}

//helper func
function classifyOnfonError(
  code: string,
): 'RETRIABLE' | 'NON_RETRIABLE' | 'UNKNOWN' {
  const RETRIABLE = new Set(['006', '033', '034']);
  const NON_RETRIABLE = new Set([
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

  if (RETRIABLE.has(code)) return 'RETRIABLE';
  if (NON_RETRIABLE.has(code)) return 'NON_RETRIABLE';
  return 'UNKNOWN';
}

const ONFON_ENDPOINT = 'https://api.onfonmedia.co.ke/v1/sms/SendBulkSMS';
const MAX_BATCH_SIZE = 500;

type OnfonResult = {
  status: 'success' | 'failed';
  code?: string;
  message: string;
  type?: 'RETRIABLE' | 'NON_RETRIABLE' | 'UNKNOWN';
};

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    result.push(arr.slice(i, i + chunkSize));
  }
  return result;
}

export async function sendSmsViaOnfon(
  to: string | string[],
  message: string,
  sender_id: string,
): Promise<OnfonResult[]> {
  const recipients = typeof to === 'string' ? [to] : to;

  if (!sender_id) throw new Error('Missing sender_id');
  if (!process.env.ONFON_ACCESS_KEY)
    throw new Error('Missing ONFON_ACCESS_KEY');

  const batches = chunkArray(recipients, MAX_BATCH_SIZE);
  const results: OnfonResult[] = [];

  for (const batch of batches) {
    try {
      const res = await axios.post(
        ONFON_ENDPOINT,
        {
          sender_name: sender_id,
          message,
          recipients: batch,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            accesskey: process.env.ONFON_ACCESS_KEY!,
          },
          timeout: 10_000,
        },
      );

      const data = res.data;

      if (data.status === 'success') {
        results.push({
          status: 'success',
          message: data.message ?? 'Sent successfully',
        });
      } else {
        const code = data.code ?? 'UNKNOWN';
        results.push({
          status: 'failed',
          code,
          message: data.message ?? 'Unknown Onfon error',
          type: classifyOnfonError(code),
        });
      }
    } catch (err: any) {
      const code = err?.response?.data?.code ?? 'NETWORK_ERROR';
      const message =
        err?.response?.data?.message ??
        err.message ??
        'Failed to reach Onfon API';

      results.push({
        status: 'failed',
        code,
        message,
        type: classifyOnfonError(code),
      });
    }
  }

  return results;
}

const smsWorker = new Worker(
  'smsQueue',
  async (job) => {
    const { user_id, to_number, cumulative, message, message_id } = job.data;

    // 1. Check quota and senderID
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('quota, sender_id')
      .eq('id', user_id)
      .single();

    if (user.quota < cumulative) {
      throw new Error(`INSUFFICIENT_QUOTA`);
    }

    if (fetchError || !user) {
      throw new Error('User not found or fetch error');
    }
    if (!user.sender_id) {
      throw new Error('Missing sender_id for user');
    }

    // 2. Deduct quota
    const { error: quotaError } = await supabase.rpc('deduct_quota_and_log', {
      uid: user_id,
      amount: cumulative,
      reason: 'send-sms',
      related_id: message_id,
    });
    if (quotaError) {
      throw new Error(`Quota deduction failed: ${quotaError.message}`);
    }

    // 3. Send SMS
    const [response] = await withTimeout(
      sendSmsViaOnfon(to_number, message, user.sender_id),
      10_000,
    );

    if (response.status === 'failed') {
      const type = classifyOnfonError(response.code!);

      if (type === 'NON_RETRIABLE') {
        throw new UnrecoverableError(`NON_RETRIABLE:${response.code}`);
      }

      throw new Error(`RETRIABLE:${response.code}`);
    }

    // 4. Mark as sent
    const eatNow = DateTime.now().setZone('Africa/Nairobi').toISO();
    await supabase
      .from('messages')
      .update({ status: 'sent', sent_at: eatNow })
      .eq('id', message_id);

    return { success: true, cumulative };
  },
  {
    connection,
    concurrency: 5,
  },
);

// Success
smsWorker.on('completed', async (job) => {
  console.log(`🎉 Job ${job.id} completed for ${job.data.to}`);
});

// Failure + Conditional Refund
smsWorker.on('failed', async (job, err) => {
  console.error(`❌ Job ${job?.id} failed: ${err.message}`);
  const eatNow = DateTime.now().setZone('Africa/Nairobi').toISO();

  if (job?.data?.message_id) {
    await supabase
      .from('messages')
      .update({ status: 'failed', failed_at: eatNow, error: err.message })
      .eq('id', job.data.message_id);
  }

  // Refund quota ONLY for retriable errors and only on last attempt

  const isRetriable =
    String(err.message).startsWith('RETRIABLE') || err.message === 'TIMEOUT';

  const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 1);

  if (isRetriable && isFinalAttempt) {
    const refundAmount = job.data.cumulative ?? 1; // fallback if missing

    console.log(
      `Refunding ${refundAmount} segment(s) for user ${job.data.user_id}`,
    );

    await supabase.rpc('refund_quota_and_log', {
      uid: job.data.user_id,
      amount: refundAmount,
      reason: 'retries_exhausted',
      related_id: job.data.message_id,
    });
  }
});
