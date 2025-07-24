import useSWR from 'swr';
import axios from 'axios';
import { useAuthStore } from './AuthStore';

export function useMetrics() {
  const initialized = useAuthStore((s) => s.initialized);
  const shouldFetch = initialized;

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? '/api/metrics' : null,
    (url) => axios.get(url, {}).then((res) => res.data),
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
