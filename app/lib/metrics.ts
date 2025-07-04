import useSWR from 'swr';

import { useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from './AuthStore';

const fetcherWithToken = (url: string, token: string) =>
  axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res) => res.data);

export function useMetrics() {
  const accessToken = useAuthStore((state) => state.accessToken);

  const shouldFetch = !!accessToken; // avoid firing without a token

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? ['/api/metrics', accessToken] : null,
    ([url, token]) => fetcherWithToken(url, token),
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
