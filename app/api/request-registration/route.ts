import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = req.headers.authorization?.split('Bearer ')[1];

  if (!accessToken) {
    return res.status(401).json({ error: 'Missing or invalid access token' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  );

  const { email: rawEmail, name: rawName } = req.body;

  const email = rawEmail?.trim().toLowerCase();
  const name = rawName?.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !name) {
    return res.status(400).json({ error: 'Missing email or name' });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // 🚨 Check if user already exists in main users table
  const { data: existingUser, error: userCheckError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (userCheckError) {
    return res.status(500).json({ error: 'Failed to check existing user.' });
  }

  if (existingUser) {
    return res
      .status(400)
      .json({ error: 'A user with this email is already registered.' });
  }

  // 🔁 Rate limit: count how many pending registrations exist in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count: recentAttempts, error: rateLimitError } = await supabase
    .from('pending_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gt('inserted_at', oneHourAgo); // requires an 'inserted_at' column

  if (rateLimitError) {
    return res.status(500).json({ error: 'Failed to enforce rate limit.' });
  }

  if ((recentAttempts ?? 0) >= 3) {
    return res.status(429).json({
      error: 'Too many registration attempts. Please try again later.',
    });
  }

  // ✅ Proceed to generate OTP and save
  const token = crypto.randomUUID();
  const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const { error: insertError } = await supabase
    .from('pending_registrations')
    .insert({
      email,
      name,
      token,
      token_expires_at: tokenExpiresAt.toISOString(),
    });

  if (insertError) {
    return res
      .status(500)
      .json({ error: 'Failed to save registration request.' });
  }

  const registrationLink = `${process.env.BASE_URL}/verify?token=${token}`;

  try {
    await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: email,
      subject: 'Complete Your Registration',
      html: `
      <p>Hello ${name},</p>
      <p>Click the link below to complete your registration:</p>
      <p><a href="${registrationLink}">${registrationLink}</a></p>
      <p>This link expires in 1 hour.</p>
    `,
    });

    return res.status(200).json({ success: true });
  } catch (emailError) {
    return res.status(500).json({ error: 'Failed to send email.' });
  }
}
