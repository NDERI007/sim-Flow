import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { ServerClient } from '../../lib/supabase/serverClient';

const redis = new Redis(process.env.REDIS_URL!);
const smsQueue = new Queue('smsQueue', { connection: redis });

export async function POST(req: NextRequest) {
  const { message_id } = await req.json();

  if (!message_id) {
    return NextResponse.json({ error: 'Missing message_id' }, { status: 400 });
  }

  const res = NextResponse.next();
  const supabase = ServerClient(req, res);
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Failed to validate', { error, user });
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Delete from DB
    const { error: deleteErr } = await supabase
      .from('messages')
      .delete()
      .eq('id', message_id)
      .eq('user_id', user.id);

    if (deleteErr) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal error', details: String(err) },
      { status: 500 },
    );
  }
  // Step 2: Delete job from BullMQ
  try {
    const flowJobId = `flow-${message_id}`;
    await smsQueue.remove(flowJobId); // will remove if job exists
  } catch (err) {
    console.error('BullMQ deletion error:', err);
  }

  return NextResponse.json({ success: true });
}
