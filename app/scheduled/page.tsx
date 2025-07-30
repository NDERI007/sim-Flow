'use client';

import useSWR from 'swr';
import {
  ScheduledList,
  type ScheduledMessage,
} from '../components/dash-comp/scheduledSends';
import { supabase } from '../lib/supabase/BrowserClient';

interface RawScheduledMessage {
  id: string;
  message: string;
  scheduled_at: string;
  groups: { group_name: string }[];
}

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

  return (data as RawScheduledMessage[]).map((msg) => ({
    id: msg.id,
    message: msg.message,
    scheduled_at: msg.scheduled_at,
    group_names: msg.groups.map((g) => g.group_name),
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
