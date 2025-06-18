// app/api/login/route.ts
import { NextResponse } from 'next/server';
import { AuthResponse, createClient } from '@supabase/supabase-js';
import { signToken } from '@/app/lib/jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const { data, error }: AuthResponse = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  const user = data?.user || data?.session?.user;

  if (error || !user) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 },
    );
  }

  // Fetch user role/quota
  const { data: userMeta } = await supabase
    .from('users')
    .select('role, quota')
    .eq('id', user.id)
    .single();

  const token = signToken({
    id: user.id,
    email,
    role: userMeta?.role || 'user',
    quota: userMeta?.quota || 1000,
  });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email,
      role: userMeta?.role || 'user',
      quota: userMeta?.quota || 1000,
    },
  });
}
