import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  let email: string | undefined;
  let otp: string | undefined;

  try {
    const body = await req.json();
    console.log('Raw request body:', body); // ✅ still good

    // ✅ Only destructure after confirming `body` is an object
    email = body.email;
    otp = body.otp;
  } catch (err) {
    console.error('Failed to parse JSON', err);
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  console.log('Parsed email and otp:', { email, otp });

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
    .limit(1)
    .maybeSingle();
  console.log('Supabase OTP lookup result:', { pending, error });

  if (error || !pending) {
    return NextResponse.json(
      { error: 'Invalid or expired OTP.' },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
