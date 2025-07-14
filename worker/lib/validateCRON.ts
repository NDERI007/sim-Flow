import { Request } from 'express';

export function validateCronSecret(req: Request) {
  const expected = process.env.CRON_SECRET;
  const received = req.headers['x-cron-secret'];

  // Normalize header (can be string or string[])
  const receivedStr = Array.isArray(received) ? received[0] : received;

  return expected && receivedStr === expected;
}
