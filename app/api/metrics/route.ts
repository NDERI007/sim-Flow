import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export async function GET(req: NextRequest) {
  try {
    // ---------------- Extract Bearer Token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 401 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    );

    // ---------------- Delivery Counts
    const { data, error: countError } = await supabase.rpc('get_message_stats');

    if (countError) {
      console.error('❌ Failed to fetch delivery counts:', countError.message);
      return NextResponse.json(
        { error: 'Failed to load message counts' },
        { status: 500 },
      );
    }

    const sent_today = data?.[0]?.sent_today ?? 0;
    const failed_count = data?.[0]?.failed_count ?? 0;

    // ---------------- Scheduled Messages
    const { data: scheduledMessages, error: scheduledError } =
      await supabase.rpc('get_group_scheduled_messages', {
        p_limit: 10,
      });

    if (scheduledError) {
      console.error('🛑 Scheduled RPC error:', scheduledError.message);
      return NextResponse.json(
        { error: 'Failed to load scheduled messages' },
        { status: 500 },
      );
    }

    const flatScheduled = (scheduledMessages ?? []).map((msg) => ({
      id: msg.id,
      message: msg.message,
      scheduled_at: msg.scheduled_at,
      group_names: (msg.groups || []).map((g) => g.group_name),
    }));

    return NextResponse.json({
      sentToday: sent_today,
      failedCount: failed_count,
      scheduled: flatScheduled,
    });
  } catch (err) {
    console.error('🔴 Unhandled /api/metrics error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
