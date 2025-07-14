import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

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

    // ---------------- Create Supabase Client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // or service key if needed
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    );

    // ---------------- Get User
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!user || error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ---------------- Time Logic
    const eatNow = DateTime.now().setZone('Africa/Nairobi');
    const eatTodayStart = eatNow.startOf('day');
    const todayUtcIso = eatTodayStart.toUTC().toISO();

    // ---------------- Delivery Counts
    const { data, error: countError } = await supabase.rpc(
      'get_delivery_counts',
      {
        p_user_id: user.id,
        p_today_utc: todayUtcIso,
      },
    );

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
      await supabase.rpc('get_scheduled_messages_with_groups', {
        p_user_id: user.id,
        p_limit: 5,
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
