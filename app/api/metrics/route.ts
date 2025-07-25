import { NextRequest, NextResponse } from 'next/server';
import { ServerClient } from '../../lib/supabase/serverClient';

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = ServerClient(req, res);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({
      sentToday: sent_today,
      failedCount: failed_count,
    });
  } catch (err) {
    console.error('Unhandled /api/metrics error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
