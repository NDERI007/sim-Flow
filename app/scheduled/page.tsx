import {
  ScheduledList,
  type ScheduledMessage,
} from '../components/dash-comp/scheduledSends';
import { createClient } from '../lib/supabase/serverSSR';

type ScheduledMessageRaw = {
  id: string;
  message: string;
  scheduled_at: string;
  groups: { id: string; group_name: string }[];
};

export default async function ScheduledPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_group_scheduled_messages', {
    p_limit: 10,
  });

  if (error) {
    console.error('RPC error:', error);
    return;
  }

  const scheduled: ScheduledMessage[] = (data as ScheduledMessageRaw[]).map(
    (msg) => ({
      ...msg,
      group_names: msg.groups.map((g) => g.group_name),
    }),
  );

  return <ScheduledList messages={scheduled} />;
}
