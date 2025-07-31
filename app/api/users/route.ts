import { NextRequest, NextResponse } from 'next/server';
import { ServerClient } from '../../lib/supabase/serverClient';

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = ServerClient(req, res);

  const { data, error } = await supabase.rpc('fetch_all_users');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
