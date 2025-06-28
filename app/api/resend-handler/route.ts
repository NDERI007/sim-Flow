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

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }

  // Get existing registration to get user's name
  const { data: reg, error: fetchError } = await supabase
    .from('pending_registrations')
    .select('name')
    .eq('email', email)
    .single();

  if (fetchError || !reg) {
    return res.status(404).json({ error: 'Pending registration not found.' });
  }

  // Generate new token + expiry
  const newToken = crypto.randomUUID();
  const newExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  // Update the token
  const { error: updateError } = await supabase
    .from('pending_registrations')
    .update({
      token: newToken,
      token_expires_at: newExpiry.toISOString(),
    })
    .eq('email', email);

  if (updateError) {
    return res.status(500).json({ error: 'Failed to update token.' });
  }

  // Send updated email
  const verificationLink = `${process.env.BASE_URL}/verify?token=${newToken}`;

  try {
    await resend.emails.send({
      from: 'noreply@yourdomain.com', // ✅ Your verified domain in Resend
      to: email,
      subject: 'New Registration Link',
      html: `
        <p>Hello ${reg.name},</p>
        <p>Your previous registration link expired.</p>
        <p>Click the new link below to complete your registration:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to resend email.' });
  }
}
