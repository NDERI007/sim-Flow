import { UnrecoverableError, Worker } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import dotenv from 'dotenv';
import axios from 'axios';
import { Job } from 'bullmq';

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

const ONFON_ENDPOINT = 'https://api.onfonmedia.co.ke/v1/sms/SendBulkSMS';
const MAX_BATCH_SIZE = 500;

type OnfonResult = {
  status: 'success' | 'failed';
  code?: string;
  message: string;
  type?: 'RETRIABLE' | 'NON_RETRIABLE' | 'UNKNOWN';
};

function classifyOnfonError(code: string): OnfonResult['type'] {
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
function isSuccessfulOnfonResponse(data: any): boolean {
  return data?.code === '000';
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function parseOnfonError(err: unknown): OnfonResult {
  if (err instanceof Error && err.message === 'TIMEOUT') {
    return {
      status: 'failed',
      code: 'TIMEOUT',
      message: 'Request timed out',
      type: 'RETRIABLE',
    };
  }

  if (axios.isAxiosError(err)) {
    const code = err.response?.data?.code ?? 'NETWORK_ERROR';
    const message = err.response?.data?.message ?? err.message;

    return {
      status: 'failed',
      code,
      message,
      type: classifyOnfonError(code),
    };
  }

  return {
    status: 'failed',
    code: 'UNKNOWN_ERROR',
    message: 'Unexpected error',
    type: 'UNKNOWN',
  };
}

export async function sendSmsViaOnfon(
  to: string | string[],
  message: string,
  sender_id: string,
): Promise<OnfonResult[]> {
  const recipients = typeof to === 'string' ? [to] : to;

  const apiKey = process.env.ONFON_ACCESS_KEY;
  const clientId = process.env.ONFON_CLIENT_ID;

  if (!sender_id) throw new Error('Missing sender_id');
  if (!apiKey) throw new Error('Missing ONFON_ACCESS_KEY');
  if (!clientId) throw new Error('Missing ONFON_CLIENT_ID');

  const results: OnfonResult[] = [];
  const batches = chunkArray(recipients, MAX_BATCH_SIZE);

  for (const batch of batches) {
    const payload = {
      SenderId: sender_id,
      ApiKey: apiKey,
      ClientId: clientId,
      MessageParameters: batch.map((number) => ({
        Number: number,
        Text: message,
      })),
    };

    try {
      const response = await axios.post(ONFON_ENDPOINT, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      });

      const data = response.data;

      if (isSuccessfulOnfonResponse(data)) {
        results.push({
          status: 'success',
          message: data.message ?? 'Sent successfully',
        });
      } else {
        const code = data.code ?? 'UNKNOWN';
        results.push({
          status: 'failed',
          code,
          message: data.message ?? 'Unknown error',
          type: classifyOnfonError(code),
        });
      }
    } catch (err) {
      results.push(parseOnfonError(err));
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
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

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
    if (job.attemptsMade === 0) {
      const { error: quotaError } = await supabase.rpc('deduct_quota_and_log', {
        uid: user_id,
        amount: cumulative,
        reason: 'send-sms',
        related_id: message_id,
      });
      if (quotaError) {
        throw new Error(`Quota deduction failed: ${quotaError.message}`);
      }
    }

    try {
      const responses = await withTimeout(
        sendSmsViaOnfon(to_number, message, user.sender_id),
        15_000,
      );
      const response = responses[0];

      if (response.status === 'failed') {
        const type = classifyOnfonError(response.code!);
        if (type === 'NON_RETRIABLE') {
          throw new UnrecoverableError(`NON_RETRIABLE:${response.code}`);
        }
        throw new Error(`RETRIABLE:${response.code}`);
      }
    } catch (err: unknown) {
      // Custom timeout error from withTimeout
      if (err instanceof Error && err.message === 'TIMEOUT') {
        console.warn('⏱️ Onfon request timed out (custom withTimeout wrapper)');
        throw new Error('RETRIABLE:TIMEOUT');
      }

      // Axios error
      if (axios.isAxiosError(err)) {
        const code = err.response?.data?.code ?? 'NETWORK_ERROR';
        const message =
          err.response?.data?.message ??
          err.message ??
          'Axios error while calling Onfon';

        console.error('📡 Axios error during Onfon request:', {
          code,
          message,
          status: err.response?.status,
          data: err.response?.data,
        });

        throw new Error(`RETRIABLE:${code}`);
      }

      // Fallback: unexpected error
      if (err instanceof Error) {
        console.error('❌ Unexpected error during SMS sending:', {
          name: err.name,
          message: err.message,
          stack: err.stack,
        });

        throw new Error('RETRIABLE:UNKNOWN_ERROR');
      }

      // If it's not even an Error instance
      console.error('❌ Unknown non-error thrown:', err);
      throw new Error('RETRIABLE:UNKNOWN_THROWN');
    }

    // 4. Mark as sent
    const eatNow = DateTime.now().setZone('Africa/Nairobi').toISO();
    await supabase
      .from('messages')
      .update({ status: 'sent', sent_at: eatNow })
      .eq('id', message_id)
      .eq('status', ['queued', 'scheduled']);

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

smsWorker.on('failed', async (job: Job | undefined, err) => {
  if (!job) {
    console.error('❌ Failed job is undefined');
    return;
  }
  console.error(`❌ Job ${job.id} failed: ${err.message}`);

  const eatNow = DateTime.now().setZone('Africa/Nairobi').toISO();

  await supabase
    .from('messages')
    .update({
      status: 'failed',
      failed_at: eatNow,
      error: err.message,
    })
    .eq('id', job.data.message_id);

  const isRetriable =
    String(err.message).startsWith('RETRIABLE') || err.message === 'TIMEOUT';

  const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 1);

  if (isRetriable && isFinalAttempt) {
    const refundAmount = job.data.cumulative ?? 1;

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
