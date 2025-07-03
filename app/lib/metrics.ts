import useSWR from 'swr';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => res.json());

export function useMetrics() {
  const { data, error, isLoading, mutate } = useSWR('/api/metrics', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 0,
  });

  return {
    sentToday: data?.sentToday ?? 0,
    failedCount: data?.failedCount ?? 0,
    scheduled: data?.scheduled ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
