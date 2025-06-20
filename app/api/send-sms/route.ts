// /app/api/send-sms/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  const { to_numbers, message } = await req.json(); // ⬅️ Updated to use multiple recipients
  const user_id = 'CLIENT_USER_ID'; // Replace with real user logic

  if (!Array.isArray(to_numbers) || to_numbers.length === 0 || !message) {
    return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });
  }

  const segmentsPerMessage = Math.ceil((message.length || 0) / 160) || 1;
  const totalSegments = segmentsPerMessage * to_numbers.length;

  // Step 1: Check user quota
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('quota')
    .eq('id', user_id)
    .single();

  if (userError || !user) {
    return NextResponse.json(
      { message: 'User not found or quota error' },
      { status: 400 },
    );
  }

  if (user.quota < totalSegments) {
    return NextResponse.json(
      { message: 'Insufficient quota' },
      { status: 403 },
    );
  }

  // Step 2: Insert all messages
  const inserts = to_numbers.map((to: string) => ({
    to_number: to,
    message,
    status: 'queued',
    created_at: new Date(),
  }));

  const { error: insertError } = await supabase
    .from('messages')
    .insert(inserts);

  if (insertError) {
    return NextResponse.json(
      { message: 'Failed to queue messages' },
      { status: 500 },
    );
  }

  // Step 3: Deduct quota
  const { error: quotaError } = await supabase
    .from('users')
    .update({ quota: user.quota - totalSegments })
    .eq('id', user_id);

  if (quotaError) {
    return NextResponse.json(
      { message: 'Messages sent but quota deduction failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    recipients: to_numbers.length,
    totalSegments,
  });
}
