// scripts/testSend.ts
import { messageQueue } from '../lib/messageQueue';
import 'dotenv/config';

(async () => {
  await messageQueue.add('send-sms', {
    userId: 'USER_UUID_HERE',
    to: '+254712345678',
    content: 'Hello from test!',
  });

  console.log('✅ Test message queued.');
})();
