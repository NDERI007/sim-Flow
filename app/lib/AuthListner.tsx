'use client';

import { useEffect } from 'react';
import { supabase } from './supabase';
import { useAuthStore } from './AuthStore';

export function AuthWrapper() {
  const getUser = useAuthStore((s) => s.getUser);
  const hydrated = useAuthStore((s) => s.hydrated);

  // Run getUser once the Zustand store is hydrated
  useEffect(() => {
    if (hydrated) {
      getUser();
    }
  }, [hydrated, getUser]);

  // Listen to auth state changes (login, logout, token refresh, etc)
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔄 Auth event: ${event}`);

        if (session) {
          useAuthStore.setState({
            user: session.user,
            accessToken: session.access_token,
          });
        } else {
          useAuthStore.setState({
            user: null,
            accessToken: null,
            userName: null,
          });
        }

        // Optional: re-run getUser if token changes
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          await getUser();
        }

        if (event === 'SIGNED_OUT') {
          useAuthStore.setState({ initialized: false });
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, [getUser]);

  return null;
}
