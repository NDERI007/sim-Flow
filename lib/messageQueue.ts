// lib/messageQueue.ts
// lib/messageQueue.ts
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
console.log('Connecting to Redis:');
const connection = new Redis(
  'rediss://default:AcaSAAIjcDEzZTJjN2I4YTQ1N2U0YzMyYTU4MzhlMmM4ZGM3NzM2OXAxMA@accurate-osprey-50834.upstash.io:6379',
); // uses localhost:6379 by default

export const messageQueue = new Queue('messages', {
  connection,
}); // ✅ Closing parenthesis added here
