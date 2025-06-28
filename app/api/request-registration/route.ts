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

  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Missing email or name' });
  }

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
