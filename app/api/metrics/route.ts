// File: /app/api/metrics/route.ts
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';

export async function GET(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {},
      },
    },
  );

  try {
    // ---------------- Auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('🛑 Auth Error:', authError.message);
      return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
    }

    if (!user) {
      console.error('🛑 No authenticated user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ---------------- Quota
    const { data: quotaData, error: quotaError } = await supabase
      .from('users')
      .select('quota')
      .eq('id', user.id)
      .single();

    if (quotaError) {
      console.error('🛑 Quota fetch error:', quotaError);
      return NextResponse.json(
        { error: 'Failed to fetch quota' },
        { status: 500 },
      );
    }

    // ---------------- Time Logic
    const eatNow = DateTime.now().setZone('Africa/Nairobi');
    const eatTodayStart = eatNow.startOf('day');
    const todayUtcIso = eatTodayStart.toUTC().toISO();

    // ---------------- Sent Today
    const { count: sentToday, error: sentTodayError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'sent')
      .gte('created_at', todayUtcIso); // ✅ Compare against UTC-based DB

    if (sentTodayError) {
      console.error('🛑 SentToday fetch error:', sentTodayError);
      return NextResponse.json(
        { error: sentTodayError.message || 'Unknown error' },
        { status: 500 },
      );
    }

    // ---------------- Scheduled Messages (5 upcoming)
    const { data: scheduledMessages, error: scheduledError } = await supabase
      .from('messages')
      .select('id, message, to_number, status')
      .eq('user_id', user.id)
      .eq('status', 'scheduled')

      .limit(5);

    if (scheduledError) {
      console.error('🛑 Scheduled messages fetch error:', scheduledError);
      return NextResponse.json(
        { error: 'Failed to load scheduled messages' },
        { status: 500 },
      );
    }

    // ---------------- Count All Scheduled
    const { count: scheduledCount, error: scheduledCountError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'scheduled');

    if (scheduledCountError) {
      console.error('🛑 Scheduled count fetch error:', scheduledCountError);
      return NextResponse.json(
        { error: 'Failed to count scheduled messages' },
        { status: 500 },
      );
    }

    // ---------------- Response
    return NextResponse.json({
      quota: quotaData.quota,
      sentToday: sentToday || 0,
      scheduledCount: scheduledCount || 0,
      scheduled: scheduledMessages || [],
    });
  } catch (err) {
    console.error('🔴 Unhandled /api/metrics error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
