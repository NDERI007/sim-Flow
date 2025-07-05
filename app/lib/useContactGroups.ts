import { supabase } from './supabase';

/**
 * Manually refreshes the `contacts_with_groups` materialized view,
 * then triggers SWR to re-fetch the latest grouped contact data.
 */
export async function refreshContactGroups() {
  const { error } = await supabase.rpc('get_user_contacts_with_groups');
  if (error) throw error;
}
