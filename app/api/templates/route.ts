import { NextRequest, NextResponse } from 'next/server';
import { ServerClient } from '../../lib/supabase/server';

async function SupabaseRequest(req: NextRequest, res: NextResponse) {
  const supabase = ServerClient(req, res);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Invalid user' };
  }

  return { supabase, user };
}

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const { supabase, user, error } = await SupabaseRequest(req, res);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { data, error: fetchError } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', user.id);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const { supabase, user, error } = await SupabaseRequest(req, res);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const { name: rawName, content: rawContent } = await req.json();
  const name = rawName?.trim();
  const content = rawContent?.trim();

  if (!name || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { error: insertError } = await supabase
    .from('templates')
    .insert([{ name, content, user_id: user.id }]);

  if (insertError) {
    console.error('Supabase error:', insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
