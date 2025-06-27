import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import Redis from 'ioredis';
import { Queue } from 'bullmq';

const rateLimitMap = new Map<string, { count: number; last: number }>();
const WINDOW = 60 * 1000; // 1 minute
const LIMIT = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, { count: 1, last: now });
    return false;
  }

  if (now - entry.last > WINDOW) {
    rateLimitMap.set(ip, { count: 1, last: now });
    return false;
  }

  if (entry.count >= LIMIT) return true;

  entry.count++;
  return false;
}

export async function DELETE(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (checkRateLimit(ip)) {
    return NextResponse.json(
      { message: 'Rate limit exceeded' },
      { status: 429 },
    );
  }
  const redis = new Redis(process.env.REDIS_URL!, {
    tls: {},
    maxRetriesPerRequest: null,
  });

  const smsQueue = new Queue('smsQueue', { connection: redis });

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

  const { id } = await req.json();

  const { data: msg, error: fetchError } = await supabase
    .from('messages')
    .select('id, user_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !msg) {
    return NextResponse.json({ message: 'Message not found' }, { status: 404 });
  }

  if (msg.user_id !== user.id) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  if (msg.status !== 'scheduled') {
    return NextResponse.json(
      { message: 'Cannot delete unscheduled message' },
      { status: 400 },
    );
  }

  const { error: deleteError } = await supabase
    .from('messages')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
  }

  //  Remove job from BullMQ
  try {
    const job = await smsQueue.getJob(id);
    if (job) {
      await job.remove();
      console.log(`🗑️ Removed BullMQ job for message ${id}`);
    } else {
      console.warn(`⚠️ No BullMQ job found for message ${id}`);
    }
  } catch (err) {
    console.error('❌ Failed to delete job from BullMQ:', err);
    // Not fatal: DB row is already gone
  }

  return NextResponse.json({ success: true });
}
