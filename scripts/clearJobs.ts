import { Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redis = new Redis(process.env.REDIS_URL!, {
  tls: {}, // Required for Upstash (even if not using TLS explicitly)
});

const smsQueue = new Queue('smsQueue', {
  connection: redis,
});

async function clearAllJobs() {
  console.log('🧹 Clearing jobs from smsQueue (Taskforce + Upstash)...');

  // Drain queued and delayed jobs
  await smsQueue.drain();

  // Job states to clean
  const states: ('completed' | 'failed' | 'wait' | 'delayed' | 'active')[] = [
    'completed',
    'failed',
    'wait',
    'delayed',
    'active',
  ];

  // Remove jobs in each state
  for (const state of states) {
    const jobs = await smsQueue.getJobs([state]);
    for (const job of jobs) {
      try {
        await job.remove();
      } catch (err) {
        console.warn(`⚠️ Could not remove job ${job.id}: ${err.message}`);
      }
    }

    // Also use `.clean()` to clear any orphaned entries
    await smsQueue.clean(0, 1000, state);
  }

  console.log('✅ All jobs in smsQueue cleared.');
}

clearAllJobs().catch((err) => {
  console.error('❌ Failed to clear jobs:', err);
  process.exit(1);
});
