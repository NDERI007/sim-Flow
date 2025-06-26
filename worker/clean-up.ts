// workers/cleanup.worker.ts
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Redis connection
const connection = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null,
});

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Cleanup job logic
const cleanupWorker = new Worker(
  'cleanupQueue',
  async () => {
    const { error } = await supabase.rpc('delete_old_messages');
    if (error) {
      console.error('❌ Failed to clean old messages:', error.message);
      throw new Error(error.message);
    }
    console.log('🧹 Old messages deleted successfully');
  },
  { connection },
);
