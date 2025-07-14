import useSWR from 'swr';
import { useEffect } from 'react';
import { useAuthStore } from './AuthStore';
import { supabase } from './supabase';

export function useQuota() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const shouldFetch = user?.id && initialized;

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? 'user-quota' : null,
    async () => {
      const { data, error } = await supabase
        .from('users')
        .select('quota')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
    },
  );

  // Supabase Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-quota-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if ('quota' in payload.new) {
            // Optional: use mutate(payload.new, false) for instant update
            mutate(); // refetch quota using SWR
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, mutate]);

  return {
    quota: data?.quota ?? 0,
    isLoading,
    isError: !!error,
    mutate,
  };
}
