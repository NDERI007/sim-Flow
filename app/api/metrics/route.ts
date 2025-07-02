// File: /app/api/metrics/route.ts
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';

export async function GET(req: NextRequest) {
  let res = NextResponse.next();
  console.log('Cookies:', req.cookies.getAll());
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),

        setAll: (cookies) => {
          cookies.forEach((cookie) => {
            res.cookies.set(cookie.name, cookie.value, cookie.options);
          });
        },
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
      .select('id, message, to_number, status, scheduled_at')
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(5);

    if (scheduledError) {
      console.error('🛑 Scheduled messages fetch error:', scheduledError);
      return NextResponse.json(
        { error: 'Failed to load scheduled messages' },
        { status: 500 },
      );
    }

    // ✅ Clean and format the response
    const cleaned = scheduledMessages.map((msg) => ({
      id: msg.id,
      to_number: Array.isArray(msg.to_number) ? msg.to_number : [msg.to_number],

      message: typeof msg.message === 'string' ? msg.message : '',
      scheduled_at: msg.scheduled_at,
    }));

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
    res = NextResponse.json(
      {
        sentToday: sentToday || 0,
        scheduledCount: scheduledCount || 0,
        scheduled: cleaned || [],
      },
      res,
    );
    return res;
  } catch (err) {
    console.error('🔴 Unhandled /api/metrics error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
