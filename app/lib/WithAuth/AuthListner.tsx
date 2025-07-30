'use client';

import { useEffect } from 'react';
import { useAuthStore } from './AuthStore';
import { supabase } from '../supabase/BrowserClient';

export function AuthWrapper() {
  useEffect(() => {
    const { setState, getState } = useAuthStore;

    // Initial hydration
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setState({
        user,
        accessToken: session?.access_token ?? null,
        initialized: true,
        hydrated: true,
        error: null,
        lastAuthAt: user?.last_sign_in_at,
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event);

        const user = session?.user ?? null;
        const newUserId = user?.id ?? null;
        const prevUserId = getState().user?.id ?? null;

        // Avoid redundant state updates for same user
        if (event === 'SIGNED_IN' && newUserId === prevUserId) {
          console.log('ignored redundant SIGNED_IN');
          return;
        }

        setState({
          user,
          accessToken: session?.access_token ?? null,
          initialized: true,
          hydrated: true,
          error: null,
        });
      },
    );

    return () => subscription?.subscription?.unsubscribe?.();
  }, []);

  return null;
}
