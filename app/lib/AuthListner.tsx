'use client';

import { useEffect } from 'react';
import { supabase } from './supabase';
import { useAuthStore } from './AuthStore';

export function AuthWrapper() {
  const getUser = useAuthStore((s) => s.getUser);
  const hydrated = useAuthStore((s) => s.hydrated);

  // Fetch current session once Zustand is ready
  useEffect(() => {
    if (hydrated) {
      getUser();
    }
  }, [hydrated, getUser]);

  // Listen to auth state changes
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth event: ${event}`);

        if (session) {
          useAuthStore.setState({
            user: session.user,
            accessToken: session.access_token,
            userName: null,
          });

          await getUser();
        } else {
          useAuthStore.setState({
            user: null,
            accessToken: null,
            userName: null,
            initialized: false,
            hydrated: false,
          });
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, [getUser]);

  return null;
}
