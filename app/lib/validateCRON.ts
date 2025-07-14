export function validateCronSecret(req: Request) {
  const expected = process.env.CRON_SECRET;
  const received = req.headers.get('x-cron-secret');
  return expected && received === expected;
}
