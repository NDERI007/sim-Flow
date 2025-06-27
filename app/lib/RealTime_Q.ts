import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { useAuthStore } from './AuthStore';

export function useQuota() {
  const user = useAuthStore((s) => s.user);
  const [quota, setQuota] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const previousQuota = useRef<number | null>(null);

  // Initial fetch on mount
  useEffect(() => {
    if (!user) return;

    const fetchInitialQuota = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('quota')
        .eq('id', user.id)
        .single();

      if (!error) {
        previousQuota.current = data.quota; // Set both current and previous initially
        setQuota(data.quota);
      }
      setIsLoading(false);
    };

    fetchInitialQuota();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`realtime:quota:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newQuota = payload.new.quota;
          if (typeof newQuota === 'number') {
            previousQuota.current = quota; // store the old quota
            setQuota(newQuota);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, quota]);

  return {
    quota,
    previousQuota: previousQuota.current,
    isLoading,
  };
}
