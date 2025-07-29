import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { ServerClient } from '../../lib/supabase/serverClient';

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
  if (error) return NextResponse.json({ error }, { status: 401 });

  // Step 2: Fetch email from users table
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('email')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.email) {
    return new Response(JSON.stringify({ error: 'Email not found' }), {
      status: 404,
    });
  }

  // Step 3: Generate secret
  const secret = speakeasy.generateSecret({
    name: `Kegi-sms:${profile.email}`, // Appears in Google Authenticator
    issuer: 'Kegi-sms', // Can be anything
  });

  await supabase
    .from('users')
    .update({ mfa_temp_secret: secret.base32 })
    .eq('id', user.id);

  const otpauth_url = secret.otpauth_url!;
  const qrCode = await qrcode.toDataURL(otpauth_url);

  return NextResponse.json({
    qrCode,
    secret: secret.base32, // optional if you also want to display the key
  });
}
