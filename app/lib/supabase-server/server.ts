import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export async function getSupabaseClientFromRequest(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return { error: 'Missing token', supabase: null, user: null };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Invalid user', supabase: null, user: null };
  }

  return { supabase, user, error: null };
}
