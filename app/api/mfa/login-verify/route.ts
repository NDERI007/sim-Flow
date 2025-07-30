import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import Redis from 'ioredis';
import { ServerClient } from '../../../lib/supabase/serverClient';

const redis = new Redis(process.env.REDIS_URL!, {
  tls: process.env.REDIS_URL?.includes('upstash') ? {} : undefined,
});

// Util to get IP (compatible with Vercel, etc.)
function getIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim(); // Use the first IP in the list
  }
  return 'unknown-ip';
}

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

  const { code, type } = await req.json();
  const ip = getIp(req);

  // ---------------------
  // Rate limiting: per IP
  // ---------------------
  const ipKey = `mfa-ip-attempts:${ip}`;
  const ipAttempts = await redis.incr(ipKey);
  if (ipAttempts === 1) {
    await redis.expire(ipKey, 60); // 1-minute window
  }
  if (ipAttempts > 5) {
    return NextResponse.json(
      { error: 'Too many attempts from your IP. Try again in a minute.' },
      { status: 429 },
    );
  }

  // ---------------------
  // Rate limiting: per user
  // ---------------------
  const attemptKey = `mfa-login-attempts:${user.id}`;
  const userAttempts = await redis.incr(attemptKey);
  if (userAttempts === 1) {
    await redis.expire(attemptKey, 60);
  }
  if (userAttempts > 5) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a minute.' },
      { status: 429 },
    );
  }

  // ---------------------
  // Validation
  // ---------------------
  if (type === 'totp') {
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid code format' },
        { status: 400 },
      );
    }

    const { data, error: fetchError } = await supabase
      .from('users')
      .select('totp_secret')
      .eq('id', user.id)
      .single();

    if (fetchError || !data?.totp_secret) {
      return NextResponse.json(
        { error: 'TOTP secret not found for this user' },
        { status: 400 },
      );
    }

    const isVerified = speakeasy.totp.verify({
      secret: data.totp_secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isVerified) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }
  } else if (type === 'backup') {
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Invalid backup code' },
        { status: 400 },
      );
    }

    const { data, error: fetchError } = await supabase
      .from('user_recovery_codes')
      .select('codes, used_codes')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !data?.codes) {
      return NextResponse.json(
        { error: 'No recovery codes found for this user' },
        { status: 400 },
      );
    }

    const { codes, used_codes = [] } = data;

    if (used_codes.includes(code)) {
      return NextResponse.json(
        { error: 'This backup code has already been used' },
        { status: 400 },
      );
    }

    // Remove the code from available codes
    const updatedCodes = codes.filter((c) => c !== code);
    const updatedUsed = [...used_codes, code];

    const { error: updateError } = await supabase
      .from('user_recovery_codes')
      .update({ codes: updatedCodes, used_codes: updatedUsed })
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to consume backup code' },
        { status: 500 },
      );
    }

    await redis.del(attemptKey);
    return NextResponse.json({ success: true });
  }
}
