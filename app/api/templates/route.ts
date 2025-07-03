import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const createSupabaseClient = (token: string) =>
  createClient(
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

async function getSupabaseClientFromRequest(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return { error: 'Missing token' };
  }

  const supabase = createSupabaseClient(token);
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
  const { supabase, user, error } = await getSupabaseClientFromRequest(req);
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
  const { supabase, user, error } = await getSupabaseClientFromRequest(req);
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
