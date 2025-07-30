import useSWR from 'swr';
import { useEffect } from 'react';
import { supabase } from '../supabase/BrowserClient';
import { useAuthStore } from '../WithAuth/AuthStore';

export interface PurchaseLog {
  id: string;
  amount: number;
  credits: number;
  status: string;
  transaction_ref: string | null;
  created_at: string;
}

// Supabase RPC fetcher
const fetchRecentPurchases = async (): Promise<PurchaseLog[]> => {
  const { data, error } = await supabase.rpc('get_recent_purchases');

  if (error) {
    console.error('Error fetching recent purchases:', error);
    throw new Error(error.message);
  }

  return data ?? [];
};

export function useRecentPurchases() {
  const user = useAuthStore((state) => state.user);

  const { data, error, isLoading, mutate } = useSWR(
    user ? 'recent-purchases' : null,
    () => fetchRecentPurchases(),
  );

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('purchases-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'purchases',
        },
        (payload) => {
          const updated = payload.new;
          if (['success', 'refunded'].includes(updated?.status)) {
            mutate();
          }
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, mutate]);

  return {
    purchases: data ?? [],
    loading: isLoading,
    error,
  };
}
