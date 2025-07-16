import useSWR from 'swr';
import { useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuthStore } from '../AuthStore';

export interface PurchaseLog {
  id: string;
  amount: number;
  credits: number;
  status: string;
  transaction_ref: string | null;
  created_at: string;
}

// Supabase RPC fetcher
const fetchRecentPurchases = async (userId: string): Promise<PurchaseLog[]> => {
  const { data, error } = await supabase.rpc('get_recent_purchases', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error fetching recent purchases:', error);
    throw new Error(error.message);
  }

  return data ?? [];
};

export function useRecentPurchases() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  const { data, error, isLoading, mutate } = useSWR(
    userId ? ['recent-purchases', userId] : null,
    () => fetchRecentPurchases(userId!),
  );

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('purchases-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'purchases',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new;
          if (['success', 'refund'].includes(updated?.status)) {
            mutate();
          }
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, mutate]);

  return {
    purchases: data ?? [],
    loading: isLoading,
    error,
  };
}
