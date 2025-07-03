import { supabase } from './supabase';
import { mutate } from 'swr';

/**
 * Manually refreshes the `contacts_with_groups` materialized view,
 * then triggers SWR to re-fetch the latest grouped contact data.
 */
export async function refreshContactGroups() {
  const { error } = await supabase.rpc('refresh_contacts_view');
  if (error) throw error;

  await mutate('contacts-with-groups');
}
