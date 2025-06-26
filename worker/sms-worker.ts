import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import dotenv from 'dotenv';
dotenv.config();

const connection = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function sendSmsViaOnfon(to: string, message: string) {
  console.log(`📨 Sending SMS to ${to}: "${message}"`);
  await new Promise((res) => setTimeout(res, 1000)); // Simulated delay
  console.log(`✅ Sent to ${to}`);
}

const smsWorker = new Worker(
  'smsQueue',
  async (job) => {
    const { user_id, to, message, message_id } = job.data;
    const segments = Math.ceil((message.length || 0) / 160) || 1;

    // 1. Check user quota
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

    // 2. Deduct quota
    const { error: quotaError } = await supabase.rpc('deduct_quota', {
      uid: user_id,
      amount: segments,
    });

    if (quotaError) {
      console.error(`❌ Quota deduction failed:`, quotaError.message);
      throw new Error(`Quota deduction failed: ${quotaError.message}`);
    }

    // 3. Send SMS
    await sendSmsViaOnfon(to, message);

    // 4. Update message as "sent" with EAT timestamp
    const eatNow = DateTime.now().setZone('Africa/Nairobi').toISO();

    const { error: updateError } = await supabase
      .from('messages')
      .update({
        status: 'sent',
        sent_at: eatNow,
      })
      .eq('id', message_id);

    if (updateError) {
      console.error(`⚠️ Failed to update message row:`, updateError.message);
    }

    return { success: true, segments };
  },
  {
    connection,
    concurrency: 5,
  },
);

// ✅ Handle success
smsWorker.on('completed', async (job) => {
  console.log(`🎉 Job ${job.id} completed for ${job.data.to}`);
});

// ❌ Handle failure and update DB with EAT timestamp
smsWorker.on('failed', async (job, err) => {
  console.error(`❌ Job ${job?.id} failed: ${err.message}`);

  if (job?.data?.message_id) {
    const eatNow = DateTime.now().setZone('Africa/Nairobi').toISO();

    const { error } = await supabase
      .from('messages')
      .update({
        status: 'failed',
        failed_at: eatNow,
        error: err.message,
      })
      .eq('id', job.data.message_id);

    if (error) {
      console.error('⚠️ Failed to mark message as failed:', error.message);
    }
  }
});
