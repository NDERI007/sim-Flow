import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { password, sender_id } = await req.json().catch(() => ({}));
  const token = req.cookies.get('verify_token')?.value;

  if (!token || !password || !sender_id) {
    return NextResponse.json(
      { error: 'Missing required fields or invalid session.' },
      { status: 400 },
    );
  }

  // Decode the JWT
  let email: string;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    email = payload.email as string;
    if (!email) throw new Error('Email missing in token');
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token.' },
      { status: 401 },
    );
  }

  // Ensure there's a pending registration
  const { data: pending, error: fetchError } = await supabase
    .from('pending_registrations')
    .select('*')
    .eq('email', email)
    .single();

  if (fetchError || !pending) {
    return NextResponse.json(
      { error: 'Registration session expired. Please restart the process.' },
      { status: 400 },
    );
  }

  // Register user
  const { data: auth, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError || !auth.user || !auth.session) {
    return NextResponse.json(
      { error: signUpError?.message || 'Signup failed.' },
      { status: 500 },
    );
  }

  const userId = auth.user.id;

  // Insert user profile
  const { error: insertError } = await supabase.from('users').insert({
    id: userId,
    email,
    name: pending.name,
    sender_id,
    quota: 0,
    role: 'admin',
  });

  if (insertError) {
    return NextResponse.json(
      { error: 'Failed to create user profile.' },
      { status: 500 },
    );
  }

  // Delete pending registration
  await supabase.from('pending_registrations').delete().eq('id', pending.id);

  const res = NextResponse.json({
    success: true,
    session: {
      access_token: auth.session.access_token,
      refresh_token: auth.session.refresh_token,
    },
  });

  // ✅ Set sb-access-token and sb-refresh-token
  res.cookies.set('sb-access-token', auth.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  res.cookies.set('sb-refresh-token', auth.session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  // ✅ Clean up verify token
  res.cookies.set('verify_token', '', {
    maxAge: 0,
    path: '/',
  });
  res.cookies.delete('verify_token');

  return res;
}
