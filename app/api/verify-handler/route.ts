import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, password, sender_id } = req.body;

  if (!token || !password || !sender_id) {
    return res
      .status(400)
      .json({ error: 'Missing token, password, or sender_id.' });
  }

  // 1. Look up pending registration by token
  const { data: pending, error: pendingError } = await supabase
    .from('pending_registrations')
    .select('*')
    .eq('token', token)
    .single();

  if (pendingError || !pending) {
    return res.status(400).json({ error: 'Invalid or expired token.' });
  }

  if (new Date(pending.token_expires_at) < new Date()) {
    return res
      .status(400)
      .json({ error: 'Token has expired. Please request a new link.' });
  }

  // 2. Sign up the user (this won't send an email if confirmation is disabled)
  const { data: auth, error: signUpError } = await supabase.auth.signUp({
    email: pending.email,
    password,
  });

  if (signUpError || !auth.user) {
    return res
      .status(500)
      .json({ error: signUpError?.message || 'Signup failed.' });
  }

  const userId = auth.user.id;

  // 3. Insert user into main `users` table
  const { error: insertError } = await supabase.from('users').insert({
    id: userId,
    email: pending.email,
    name: pending.name,
    sender_id,
    quota: 0,
    role: 'admin',
  });

  if (insertError) {
    return res.status(500).json({ error: 'User profile insert failed.' });
  }

  // 4. Clean up pending registration
  await supabase.from('pending_registrations').delete().eq('id', pending.id);

  // 5. Return session to frontend for auto-login
  return res.status(200).json({
    session: auth.session,
    user: auth.user,
  });
}
