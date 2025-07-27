'use client';

import useSWR from 'swr';
import {
  ScheduledList,
  type ScheduledMessage,
} from '../components/dash-comp/scheduledSends';
import { supabase } from '../lib/supabase/BrowserClient';

const fetchScheduledMessages = async (): Promise<ScheduledMessage[]> => {
  const {
    data: { user },
    error: UserERR,
  } = await supabase.auth.getUser();

  if (UserERR || !user) {
    console.error('Failed to validate', { UserERR, user });
  }

  const { data, error } = await supabase.rpc('get_group_scheduled_messages', {
    p_limit: 10,
  });

  if (error) throw error;

  return (data as any[]).map((msg) => ({
    ...msg,
    group_names: msg.groups.map((g: any) => g.group_name),
  }));
};

export default function ScheduledPage() {
  const {
    data: messages,
    error,
    isLoading,
    mutate,
  } = useSWR('scheduledMessages', fetchScheduledMessages, {
    refreshInterval: 30000,
  });

  if (isLoading) return <div>Loading scheduled messages...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="flex min-h-screen justify-center overflow-auto bg-gray-900 px-4 py-10">
      <div className="w-full max-w-xl">
        <ScheduledList messages={messages} onDelete={() => mutate} />
      </div>
    </div>
  );
}
