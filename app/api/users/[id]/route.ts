import { NextRequest, NextResponse } from 'next/server';
import { ServerClient } from '../../../lib/supabase/serverClient';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const res = NextResponse.next();
  const supabase = ServerClient(req, res);

  const { sender_id, quota } = await req.json();

  const { error } = await supabase.rpc('update_user_admin', {
    uid: params.id,
    new_sender_id: sender_id,
    new_quota: quota,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
