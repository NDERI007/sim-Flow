import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import Redis from 'ioredis';
import { ServerClient } from '../../../lib/supabase/serverClient';

const redis = new Redis(process.env.REDIS_URL!, {
  tls: process.env.REDIS_URL?.includes('upstash') ? {} : undefined,
});

async function SupabaseRequest(req: NextRequest, res: NextResponse) {
  const supabase = ServerClient(req, res);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Invalid user' };
  }

  return { supabase, user };
}

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const { supabase, user, error } = await SupabaseRequest(req, res);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await req.json();

  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
  }

  const attemptKey = `mfa-attempts:${user.id}`;
  const attempts = await redis.incr(attemptKey);
  if (attempts === 1) {
    await redis.expire(attemptKey, 60); // 1-minute window
  }

  if (attempts > 5) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a minute.' },
      { status: 429 },
    );
  }

  //Fetch temp secret
  const { data, error: fetchError } = await supabase
    .from('users')
    .select('mfa_temp_secret')
    .eq('id', user.id)
    .single();

  if (fetchError || !data?.mfa_temp_secret) {
    return NextResponse.json(
      { error: 'No pending MFA setup found' },
      { status: 400 },
    );
  }

  // Verify code
  const isVerified = speakeasy.totp.verify({
    secret: data.mfa_temp_secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  if (!isVerified) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  await supabase
    .from('users')
    .update({
      mfa_enabled: true,
      totp_secret: data.mfa_temp_secret,
      mfa_temp_secret: null,
    })
    .eq('id', user.id);

  await redis.del(attemptKey);

  return NextResponse.json({ success: true });
}
