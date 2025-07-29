import { nanoid } from 'nanoid';
import { supabase } from '../supabase/BrowserClient';

async function hashSHA256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function generateRecoveryCodes(): Promise<{
  success: boolean;
  codes?: string[];
  error?: string;
}> {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return { success: false, error: 'User not found' };
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('recovery_codes_generated')
    .eq('id', user.id)
    .single();

  if (userRow?.recovery_codes_generated) {
    return { success: false, error: 'Already generated' };
  }

  const newCodes = Array.from({ length: 10 }, () => nanoid(10).toUpperCase());
  const hashedCodes = await Promise.all(newCodes.map(hashSHA256));

  const { error: upsertError } = await supabase
    .from('user_recovery_codes')
    .upsert(
      {
        user_id: user.id,
        codes: hashedCodes,
        used_codes: [],
      },
      { onConflict: 'user_id' },
    );

  if (upsertError) {
    return { success: false, error: upsertError.message };
  }

  await supabase
    .from('users')
    .update({ recovery_codes_generated: true })
    .eq('id', user.id);

  return { success: true, codes: newCodes };
}
