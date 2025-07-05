'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

export function useAuthGuard(redirectTo = '/unAuth') {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push(redirectTo);
        return;
      }

      // Check if last_sign_in_at is older than 2 months
      const lastSignIn = user?.last_sign_in_at;
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      if (lastSignIn && new Date(lastSignIn) < twoMonthsAgo) {
        await supabase.auth.signOut();
        router.push(redirectTo);
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkAuth();
  }, [router, redirectTo]);

  return { user, loading };
}
