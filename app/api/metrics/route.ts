import { NextRequest, NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { getSupabaseClientFromRequest } from '../../lib/supabase-server/server';

export async function GET(req: NextRequest) {
  try {
    // ---------------- Auth via access token
    const { user, supabase, error } = await getSupabaseClientFromRequest(req);

    if (error || !user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ---------------- Time Logic
    const eatNow = DateTime.now().setZone('Africa/Nairobi');
    const eatTodayStart = eatNow.startOf('day');
    const todayUtcIso = eatTodayStart.toUTC().toISO();

    // ---------------- Sent Today // ---------------- Count All failed
    const { data: counts, error: countError } = await supabase.rpc(
      'get_delivery_counts',
      {
        p_user_id: user.id,
        p_today_utc: todayUtcIso,
      },
    );

    // ---------------- Scheduled Messages

    const { data: scheduledMessages, error: scheduledError } =
      await supabase.rpc('get_scheduled_messages_with_groups', {
        p_user_id: user.id,
        p_limit: 5,
      });

    const flatScheduled = (
      scheduledMessages as {
        id: string;
        message: string;
        scheduled_at: string;
        groups?: { id: string; group_name: string }[] | null;
      }[]
    ).map((msg) => ({
      id: msg.id,
      message: msg.message,
      scheduled_at: msg.scheduled_at,
      group_names: (msg.groups || []).map((g) => g.group_name),
    }));

    if (scheduledError) {
      console.error('🛑 Scheduled RPC error:', scheduledError.message);
      return NextResponse.json(
        { error: 'Failed to load scheduled messages' },
        { status: 500 },
      );
    }

    // ---------------- Response
    return NextResponse.json({
      sentToday: counts?.sent_today || 0,
      failedCount: counts?.failed_count || 0,
      scheduled: flatScheduled || [],
    });
  } catch (err) {
    console.error('🔴 Unhandled /api/metrics error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
