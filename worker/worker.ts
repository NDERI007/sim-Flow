// worker/worker.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

(async () => {
  console.time('Insert');
  const { error } = await supabase.from('messages').insert({
    to_number: '+254700000000',
    message: 'Test message',
    status: 'sent',
    sent_at: new Date(),
  });
  console.timeEnd('Insert');

  if (error) {
    console.error('❌ Insert error:', error.message);
  } else {
    console.log('✅ Insert success');
  }
})();
