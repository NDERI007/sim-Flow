import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { email, password, sender_id } = await req.json();

  if (!email || !password || !sender_id) {
    return NextResponse.json(
      { error: 'Missing required fields.' },
      { status: 400 },
    );
  }

  const now = DateTime.now().setZone('Africa/Nairobi').toISO();

  const { data: pending, error: fetchError } = await supabase
    .from('pending_registrations')
    .select('*')
    .eq('email', email)
    .single();

  if (fetchError || !pending) {
    return NextResponse.json(
      { error: 'OTP expired or invalid.' },
      { status: 400 },
    );
  }

  const { data: auth, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError || !auth.user) {
    return NextResponse.json(
      { error: signUpError?.message || 'Signup failed.' },
      { status: 500 },
    );
  }

  const userId = auth.user.id;

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
      { error: 'Failed to insert user profile.' },
      { status: 500 },
    );
  }

  await supabase.from('pending_registrations').delete().eq('id', pending.id);

  return NextResponse.json({ session: auth.session, user: auth.user });
}
