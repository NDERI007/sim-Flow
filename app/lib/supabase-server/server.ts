import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export async function getSupabaseClientFromRequest(req: NextRequest) {
  const rawAuth = req.headers.get('authorization');
  const token = rawAuth?.toLowerCase().startsWith('bearer ')
    ? rawAuth.slice(7)
    : null;

  if (!token) {
    return { error: 'Missing token', supabase: null, user: null };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Pass the token manually here
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: 'Invalid user', supabase: null, user: null };
  }

  return { supabase, user, error: null };
}
