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
connection.ping().then(console.log).catch(console.error); // Should print "PONG"
const smsQueue = new Queue('smsQueue', { connection });
// Kenyan phone number validator + normalizer
function validateAndFormatKenyanNumber(input: string): string | null {
  const trimmed = input.trim().replace(/\s+/g, '');

  if (/^\+2547\d{8}$/.test(trimmed)) return trimmed;
  if (/^2547\d{8}$/.test(trimmed)) return `+${trimmed}`;
  if (/^07\d{8}$/.test(trimmed)) return `+254${trimmed.slice(1)}`;

  return null;
}
console.log('✅ Inside /api/send-sms POST handler');

export async function POST(req: NextRequest) {
  console.log('✅ Inside /api/send-sms POST handler');

  try {
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

    console.log('🟡 Supabase client initialized');

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('🟡 Fetched user:', user);

    if (authError || !user) {
      console.log('🔴 Unauthorized access attempt');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('📦 Body:', body);

    const { to_number, message, scheduledAt } = body;

    let delay = 0;
    let scheduledTime: Date | null = null;

    if (scheduledAt) {
      scheduledTime = new Date(scheduledAt);
      console.log('🕓 Scheduled for:', scheduledTime);

      if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
        console.log('🔴 Invalid schedule date');
        return NextResponse.json(
          { message: 'Invalid future date' },
          { status: 400 },
        );
      }
      delay = scheduledTime.getTime() - Date.now();
    }

    if (!Array.isArray(to_number)) {
      console.log('🔴 to_numbers is not an array:', to_number);
      return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });
    }

    if (to_number.length === 0) {
      console.log('🔴 to_numbers is empty');
      return NextResponse.json(
        { message: 'No recipients provided.' },
        { status: 400 },
      );
    }

    if (typeof message !== 'string') {
      console.log('🔴 message is not a string:', typeof message);
      return NextResponse.json(
        { message: 'Invalid message format.' },
        { status: 400 },
      );
    }

    if (message.trim().length === 0) {
      console.log('🔴 message is blank:', JSON.stringify(message));
      return NextResponse.json(
        { message: 'Message cannot be blank.' },
        { status: 400 },
      );
    }

    const formattedNumbers: string[] = [];
    for (const raw of to_number) {
      const formatted = validateAndFormatKenyanNumber(raw);
      if (!formatted) {
        console.log('🔴 Invalid phone format:', raw);
        return NextResponse.json(
          { message: `Invalid phone format: ${raw}` },
          { status: 400 },
        );
      }
      formattedNumbers.push(formatted);
    }

    const segmentsPerMessage = Math.ceil((message.length || 0) / 160) || 1;
    const totalSegments = segmentsPerMessage * formattedNumbers.length;

    console.log('📝 Inserting messages into Supabase...');
    const { data: insertedMessages, error: insertError } = await supabase
      .from('messages')
      .insert(
        formattedNumbers.map((to) => ({
          to_number,
          message,
          user_id: user.id,
          status: scheduledAt ? 'scheduled' : 'queued',
          scheduled_at: scheduledAt
            ? new Date(scheduledAt).toISOString()
            : null,
        })),
      )
      .select();

    if (insertError || !insertedMessages) {
      console.log('❌ DB insert failed:', insertError?.message);
      return NextResponse.json(
        { message: 'DB insert failed', error: insertError?.message },
        { status: 500 },
      );
    }

    console.log('📬 Inserting jobs to Redis queue...');
    const jobs = insertedMessages.map((msg) => ({
      name: 'send_sms',
      data: {
        message_id: msg.id,
        user_id: user.id,
        to: msg.to,
        message: msg.message,
        metadata: { source: 'dashboard', scheduled: Boolean(scheduledAt) },
      },
      opts: {
        jobId: msg.id,
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }));

    await smsQueue.addBulk(jobs);
    console.log('✅ Successfully enqueued all jobs');

    return NextResponse.json({
      success: true,
      recipients: formattedNumbers.length,
      scheduled: Boolean(scheduledAt),
      scheduledFor: scheduledAt ?? null,
      totalSegments,
    });
  } catch (err: any) {
    console.error('❌ Caught Error in POST /api/send-sms');
    console.error('Message:', err?.message || err);
    console.error('Stack:', err?.stack || 'No stack');

    return NextResponse.json(
      {
        message: 'Internal Server Error',
        error: err?.message || String(err),
        stack: err?.stack || null,
      },
      { status: 500 },
    );
  }
}
