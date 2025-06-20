// scripts/testSend.ts
import { messageQueue } from '../lib/messageQueue';
import 'dotenv/config';

(async () => {
  await messageQueue.add(
    'send-sms',
    {
      to_number: '+254712345678',
      message: 'Hello from test!',
    },
    {
      attempts: 1, // 👈 No retries
      removeOnComplete: true,
      removeOnFail: true,
    },
  );

  console.log('✅ Test message queued.');
})();
