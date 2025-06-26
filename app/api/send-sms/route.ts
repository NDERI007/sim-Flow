// /app/api/send-sms/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Setup BullMQ with safe Redis settings
const connection = new Redis(process.env.REDIS_URL!, {
  tls: {},
  maxRetriesPerRequest: null, // ✅ Prevent Redis-layer retries
});

const smsQueue = new Queue('smsQueue', { connection });
// Kenyan phone number validator + normalizer
function validateAndFormatKenyanNumber(input: string): string | null {
  const trimmed = input.trim().replace(/\s+/g, '');

  if (/^\+2547\d{8}$/.test(trimmed)) return trimmed;
  if (/^2547\d{8}$/.test(trimmed)) return `+${trimmed}`;
  if (/^07\d{8}$/.test(trimmed)) return `+254${trimmed.slice(1)}`;

  return null;
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  console.log('📦 Received body:', body);
  const { to_numbers, message, scheduledAt } = body;

  let delay = 0;
  let scheduledTime: Date | null = null;

  if (scheduledAt) {
    scheduledTime = new Date(scheduledAt);
    if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
      return NextResponse.json(
        { message: 'Invalid future date' },
        { status: 400 },
      );
    }
    delay = scheduledTime.getTime() - Date.now(); // ms delay for BullMQ
  }

  if (!Array.isArray(to_numbers) || to_numbers.length === 0 || !message) {
    return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });
  }

  // ✅ Validate and format numbers
  const formattedNumbers: string[] = [];

  for (const raw of to_numbers) {
    const formatted = validateAndFormatKenyanNumber(raw);
    if (!formatted) {
      return NextResponse.json(
        { message: `Invalid phone format: ${raw}` },
        { status: 400 },
      );
    }
    formattedNumbers.push(formatted);
  }

  const segmentsPerMessage = Math.ceil((message.length || 0) / 160) || 1;
  const totalSegments = segmentsPerMessage * formattedNumbers.length;

  // 1. Create message rows in Supabase
  const { data: insertedMessages, error: insertError } = await supabase
    .from('messages')
    .insert(
      formattedNumbers.map((to) => ({
        to,
        message,
        user_id: user.id,
        status: scheduledAt ? 'scheduled' : 'queued',
      })),
    )
    .select(); // to get inserted IDs

  if (insertError || !insertedMessages) {
    return NextResponse.json(
      { message: 'DB insert failed', error: insertError?.message },
      { status: 500 },
    );
  }

  // ✅ Enqueue messages (quota handled in worker)
  // 2. Add jobs with DB record IDs, So the worker can update the correct message row in the database after the job finishes (sent or failed).
  const jobs = insertedMessages.map((msg, i) => ({
    name: 'send_sms',
    data: {
      message_id: msg.id,
      user_id: user.id,
      to: msg.to,
      message: msg.message,
      metadata: { source: 'dashboard', scheduled: Boolean(scheduledAt) },
    },
    opts: {
      delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  }));

  try {
    await smsQueue.addBulk(jobs);
  } catch (err) {
    console.error('❌ Queueing failed:', err);
    return NextResponse.json(
      { message: 'Queueing failed', error: String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    recipients: formattedNumbers.length,
    scheduled: Boolean(scheduledAt),
    scheduledFor: scheduledAt ?? null,
    totalSegments,
  });
}
