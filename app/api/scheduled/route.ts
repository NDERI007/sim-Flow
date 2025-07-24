import { NextRequest, NextResponse } from 'next/server';
import { ServerClient } from '../../lib/supabase/server';

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = ServerClient(req, res);

  const { data, error } = await supabase.rpc('get_group_scheduled_messages', {
    p_limit: 10,
  });

  if (error) {
    console.error('🛑 Scheduled RPC error:', error.message);
    return NextResponse.json(
      { error: 'Failed to load scheduled messages' },
      { status: 500 },
    );
  }

  const flatScheduled = (data ?? []).map((msg) => ({
    id: msg.id,
    message: msg.message,
    scheduled_at: msg.scheduled_at,
    group_names: (msg.groups || []).map((g: any) => g.group_name),
  }));

  return NextResponse.json({ scheduled: flatScheduled });
}
