import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signToken } from '@/app/lib/jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'Failed to register' },
      { status: 400 },
    );
  }

  // Optionally store role metadata
  const { error: insertError } = await supabase.from('users').insert({
    id: data.user.id,
    email,
    role: 'user',
    quota: 1000,
  });

  if (insertError) {
    console.error('Insert Error:', insertError);
    return NextResponse.json(
      { error: 'Signup succeeded but user insert failed' },
      { status: 500 },
    );
  }

  const token = signToken({
    id: data.user.id,
    email,
    role: 'user',
  });

  return NextResponse.json({ token });
}
