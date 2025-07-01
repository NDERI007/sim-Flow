// /api/resend-handler.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { DateTime } from 'luxon';

const resend = new Resend(process.env.RESEND_API_KEY);

// ⚠️ Use service role key here — only safe on server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }

  // Fetch registration entry
  const { data: reg, error: fetchError } = await supabase
    .from('pending_registrations')
    .select('name')
    .eq('email', email)
    .single();

  if (fetchError || !reg) {
    return NextResponse.json(
      { error: 'Pending registration not found.' },
      { status: 404 },
    );
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Set OTP expiry (10 minutes)
  const otpExpiresAt = DateTime.now()
    .setZone('Africa/Nairobi')
    .plus({ minutes: 10 })
    .toISO();

  const { error: updateError } = await supabase
    .from('pending_registrations')
    .update({
      otp,
      otp_expires_at: otpExpiresAt,
    })
    .eq('email', email);

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update OTP.' },
      { status: 500 },
    );
  }

  try {
    await resend.emails.send({
      from: 'noreply@qualitechlabs.org',
      to: email,
      subject: 'Your Registration OTP',
      html: `
        <p>Hello ${reg.name},</p>
        <p>Your OTP to complete registration is:</p>
        <h2>${otp}</h2>
        <p>It will expire in 10 minutes.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to send OTP email:', err);
    return NextResponse.json({ error: 'Failed to send OTP.' }, { status: 500 });
  }
}
