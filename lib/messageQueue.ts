// lib/messageQueue.ts
import 'dotenv/config';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
const connection = new Redis(process.env.REDIS_URL!); // uses localhost:6379 by default

export const messageQueue = new Queue('messages', {
  connection,
}); // ✅ Closing parenthesis added here
