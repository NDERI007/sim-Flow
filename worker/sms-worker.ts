// sms.worker.ts
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const connection = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null, // ✅ Disable Redis command retries
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function sendSmsViaOnfon(to: string, message: string) {
  console.log(`📨 Sending SMS to ${to}: "${message}"`);
  await new Promise((res) => setTimeout(res, 1000)); // mock delay
  console.log(`✅ Sent to ${to}`);
}

const smsWorker = new Worker(
  'smsQueue',
  async (job) => {
    const { user_id, to, message } = job.data;
    const segments = Math.ceil((message.length || 0) / 160) || 1;

    const { data, error: fetchError } = await supabase
      .from('users')
      .select('quota')
      .eq('id', user_id)
      .single();

    if (fetchError || !data) {
      throw new Error(`User quota check failed: ${fetchError?.message}`);
    }

    if (data.quota < segments) {
      throw new Error(
        `User has insufficient quota. Required: ${segments}, Available: ${data.quota}`,
      );
    }

    const { error: quotaError } = await supabase.rpc('deduct_quota', {
      uid: user_id,
      amount: segments,
    });

    if (quotaError) {
      console.error(`❌ Quota deduction failed:`, quotaError.message);
      throw new Error(`Quota deduction failed: ${quotaError.message}`);
    }

    await sendSmsViaOnfon(to, message);
    return { success: true, segments };
  },
  {
    connection,
    concurrency: 5, // optional: handle 5 jobs in parallel
  },
);

smsWorker.on('completed', (job) => {
  console.log(`🎉 Job ${job.id} completed for ${job.data.to}`);
});

smsWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed: ${err.message}`);
});
