import useSWR from 'swr';
import axios from 'axios';
import { useAuthStore } from './AuthStore';

export function useMetrics() {
  const token = useAuthStore((s) => s.accessToken);
  const initialized = useAuthStore((s) => s.initialized);
  const shouldFetch = token && initialized;

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? ['/api/metrics', token] : null,
    ([url, Token]) =>
      axios
        .get(url, {
          headers: {
            Authorization: `Bearer ${Token}`,
          },
        })
        .then((res) => res.data),
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
    },
  );

  return {
    sentToday: data?.sentToday ?? 0,
    failedCount: data?.failedCount ?? 0,
    scheduled: data?.scheduled ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
