import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import { SignJWT } from 'jose';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { email, otp } = await req.json().catch(() => ({}));

  if (!email || !otp) {
    return NextResponse.json(
      { error: 'Missing email or OTP.' },
      { status: 400 },
    );
  }

  const now = DateTime.utc().toISO();

  const { data: pending, error } = await supabase
    .from('pending_registrations')
    .select('id')
    .eq('email', email)
    .eq('otp', otp)
    .gt('otp_expires_at', now)
    .maybeSingle();

  if (error || !pending) {
    return NextResponse.json(
      { error: 'Invalid or expired OTP.' },
      { status: 400 },
    );
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);

  const res = NextResponse.json({ ok: true });

  res.cookies.set('verify_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  });

  return res;
}
