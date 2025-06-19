// app/api/send-message/route.ts
import { NextResponse } from 'next/server';
import { messageQueue } from '../lib/messageQueue';
import 'dotenv/config';

export async function POST(req: Request) {
  const body = await req.json();

  const { userId, to, content } = body;

  // Add job to the queue
  await messageQueue.add('send-sms', {
    userId,
    to,
    content,
  });

  return NextResponse.json({
    success: true,
    message: 'Message queued for delivery.',
  });
}
