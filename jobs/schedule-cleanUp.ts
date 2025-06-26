// jobs/schedule-cleanup.ts
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const connection = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null,
});

const cleanupQueue = new Queue('cleanupQueue', { connection });

async function scheduleCleanup() {
  await cleanupQueue.add(
    'daily_message_cleanup',
    {},
    {
      repeat: { pattern: '0 0 * * *' }, // Every day at 3am in EAT timezone
      removeOnComplete: true,
    },
  );

  console.log('📅 Scheduled daily cleanup at 3:00 AM');
}

scheduleCleanup();
