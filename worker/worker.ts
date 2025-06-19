// worker/worker.ts
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const redis = new Redis(
  'rediss://default:AcaSAAIjcDEzZTJjN2I4YTQ1N2U0YzMyYTU4MzhlMmM4ZGM3NzM2OXAxMA@accurate-osprey-50834.upstash.io:6379',
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 🔐 Use the service role key here
);

const worker = new Worker(
  'messages',
  async (job) => {
    const { userId, to, content } = job.data;

    console.log(`📤 Sending SMS to ${to}: "${content}"`);

    // Simulate delay and random failure
    await new Promise((res) => setTimeout(res, 2000));

    const success = Math.random() > 0.1; // 90% delivery success

    // Log delivery (fake)
    await supabase.from('messages').insert({
      user_id: userId,
      recipient: to,
      content,
      status: success ? 'sent' : 'failed',
      created_at: new Date().toISOString(),
    });

    // Deduct balance (if successful)
    if (success) {
      await supabase.rpc('deduct_sms_quota', { uid: userId, amount: 1 });
    }

    return success ? 'Delivered' : 'Failed';
  },
  { connection: redis },
);
