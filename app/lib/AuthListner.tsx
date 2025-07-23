'use client';

import { useEffect } from 'react';
import { supabase } from './supabase';
import { useAuthStore } from './AuthStore';

export function AuthWrapper() {
  const getUser = useAuthStore((s) => s.getUser);
  const hydrated = useAuthStore((s) => s.hydrated);

  // Only run getUser when Zustand rehydrates
  useEffect(() => {
    if (hydrated) {
      getUser();
    }
  }, [hydrated, getUser]);

  // Handle auth state changes (login, refresh, logout)
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔄 Auth event: ${event}`);

        if (session) {
          useAuthStore.setState({
            user: session.user,
            accessToken: session.access_token,
          });

          // Refetch profile (now includes polling fallback)
          await getUser();
        } else {
          // Clear all state
          useAuthStore.setState({
            user: null,
            accessToken: null,
            initialized: false,
          });
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, [getUser]);

  return null;
}
