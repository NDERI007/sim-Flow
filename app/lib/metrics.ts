import useSWR from 'swr';
import axios from 'axios';
import { useFreshAccessToken } from './UseFResh';

export function useMetrics() {
  const { token, isLoading: tokenLoading } = useFreshAccessToken();
  const shouldFetch = token && !tokenLoading;

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? ['/api/metrics', token] : null,
    ([url, freshToken]) =>
      axios
        .get(url, {
          headers: {
            Authorization: `Bearer ${freshToken}`,
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
