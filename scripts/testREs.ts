// scripts/testRedis.ts
import Redis from 'ioredis';
import 'dotenv/config';

const client = new Redis(process.env.REDIS_URL!);

(async () => {
  try {
    await client.set('foo', 'bar');
    const result = await client.get('foo');
    console.log('✅ Redis is working:', result); // should print "bar"
    process.exit(0);
  } catch (err) {
    console.error('❌ Redis error:', err);
    process.exit(1);
  }
})();
