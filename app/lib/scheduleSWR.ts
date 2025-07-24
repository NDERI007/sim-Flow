import useSWR from 'swr';
import axios from 'axios';

export function useScheduledMessages() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/scheduled',
    (url) => axios.get(url).then((res) => res.data),
    {
      revalidateOnFocus: false,
    },
  );

  return {
    scheduled: data?.scheduled ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
