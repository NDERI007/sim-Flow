// lib/hooks/useMetrics.ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useMetrics() {
  const { data, error, isLoading, mutate } = useSWR('/api/metrics', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 0, // or set e.g. 30_000 for polling
  });

  return {
    sentToday: data?.sentToday ?? 0,
    scheduledCount: data?.scheduledCount ?? 0,
    scheduled: data?.scheduled ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
