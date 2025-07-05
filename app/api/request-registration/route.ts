import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { DateTime } from 'luxon';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { email: rawEmail, name: rawName } = await req.json();

  const email = rawEmail?.trim().toLowerCase();
  const name = rawName?.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !name) {
    return NextResponse.json(
      { error: 'Missing email or name' },
      { status: 400 },
    );
  }

  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 },
    );
  }

  // ✅ Rate limit check
  const oneHourAgo = DateTime.now().toUTC().minus({ hours: 1 }).toISO();

  const { count: recentAttempts, error: rateError } = await supabase
    .from('pending_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gt('inserted_at', oneHourAgo);

  if (rateError) {
    return NextResponse.json(
      { error: 'Failed to enforce rate limit.' },
      { status: 500 },
    );
  }

  if ((recentAttempts ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait before trying again.' },
      { status: 429 },
    );
  }

  function generateAlphanumericOTP(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 1, 0
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return otp;
  }

  const otp = generateAlphanumericOTP(); // e.g., "Z7M4QX"

  //  Set expiration in EAT, store as UTC
  const eatExpiry = DateTime.now()
    .setZone('Africa/Nairobi')
    .plus({ minutes: 15 });
  const otpExpiresAt = eatExpiry.toUTC().toISO();

  const { error: insertError } = await supabase
    .from('pending_registrations')
    .insert({
      email,
      name,
      otp,
      otp_expires_at: otpExpiresAt,
    });

  if (insertError) {
    console.error('Supabase insert error:', insertError);
    return NextResponse.json({ error: 'Failed to save OTP.' }, { status: 500 });
  }

  // Send email with OTP
  try {
    await resend.emails.send({
      from: 'noreply@qualitechlabs.org',
      to: email,
      subject: 'Your One-Time Password (OTP)',
      html: `
        <p>Hello ${name},</p>
        <p>Your OTP is:</p>
        <h2>${otp}</h2>
        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/verify?email=${encodeURIComponent(email)}" target="_blank">Complete Registration</a>
  
        <p>It will expire at <strong>${eatExpiry.toFormat('hh:mm a')} EAT</strong>.</p>
        <p>If you didn’t request this, you can ignore this email.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (emailError) {
    console.error('Resend error:', emailError);
    return NextResponse.json(
      { error: 'Failed to send OTP email.' },
      { status: 500 },
    );
  }
}
