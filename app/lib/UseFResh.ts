import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuthStore } from './AuthStore';

export function useFreshAccessToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    let isMounted = true;

    const refresh = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error || !data.session) {
        setToken(null);
        setIsLoading(false);
      } else {
        // Optional: keep Zustand in sync
        useAuthStore.setState({
          user: data.session.user,
          accessToken: data.session.access_token,
        });
        setToken(data.session.access_token);
        setIsLoading(false);
      }
    };

    if (initialized) {
      refresh();
    }

    return () => {
      isMounted = false;
    };
  }, [initialized]);

  return { token, isLoading };
}
