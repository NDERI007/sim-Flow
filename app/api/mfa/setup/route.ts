import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { ServerClient } from '../../../lib/supabase/serverClient';

async function SupabaseRequest(req: NextRequest, res: NextResponse) {
  const supabase = ServerClient(req, res);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { error: 'Invalid user' };
  return { supabase, user };
}

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const { supabase, user, error } = await SupabaseRequest(req, res);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('email') // We no longer need to fetch the old secret
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.email) {
    return NextResponse.json(
      { error: 'User profile not found' },
      { status: 404 },
    );
  }

  // --- Refactored Logic ---
  // Always generate a new secret each time the setup flow is initiated.
  // This prevents reusing an old or potentially exposed secret.
  const secret = speakeasy.generateSecret({
    name: `Kegi-sms:${profile.email}`,
    issuer: 'Kegi-sms',
  });

  const base32 = secret.base32;

  // Save this new temporary secret to the database.
  // It should be verified and moved to a permanent column upon successful code entry.
  const { error: updateError } = await supabase
    .from('users')
    .update({ mfa_temp_secret: base32 })
    .eq('id', user.id);

  if (updateError) {
    console.error('MFA Secret Update Error:', updateError);
    return NextResponse.json(
      { error: 'Failed to save MFA secret' },
      { status: 500 },
    );
  }

  // Generate the OTP Auth URL and QR code for the new secret.
  const otpauthUrl = speakeasy.otpauthURL({
    secret: base32,
    label: `Kegi-sms:${profile.email}`,
    issuer: 'Kegi-sms',
    encoding: 'base32',
  });

  const qrCode = await qrcode.toDataURL(otpauthUrl);

  // Return the QR code for the user to scan.
  return NextResponse.json({ qrCode, secret: base32 });
}
