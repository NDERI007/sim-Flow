import useSWR from 'swr';
import axios from 'axios';
import { useAuthStore } from './WithAuth/AuthStore';

export function useMetrics() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const userId = user?.id;

  const shouldFetch = initialized && !!userId;

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? `/api/metrics?user=${userId}` : null, // Unique SWR key per user
    async () => {
      const res = await axios.get('/api/metrics');
      return res.data;
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
    },
  );

  return {
    sentToday: data?.sentToday ?? 0,
    failedCount: data?.failedCount ?? 0,
    isLoading,
    isError: !!error,
    mutate,
  };
}
