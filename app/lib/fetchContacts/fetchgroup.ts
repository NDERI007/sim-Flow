import { SupabaseClient } from '@supabase/supabase-js';

export async function fetchGroupContacts(
  supabase: SupabaseClient,
  groupIds: string[],
) {
  const { data, error } = await supabase.rpc('get_contacts_by_group_ids', {
    group_ids: groupIds,
  });

  if (error) {
    console.error('❌ Supabase RPC Error in fetchGroupContacts:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      groupIds,
    });

    throw new Error(`Failed to fetch group contacts: ${error.message}`);
  }

  if (!data) {
    console.warn('⚠️ Supabase RPC returned no data in fetchGroupContacts:', {
      groupIds,
    });
  }

  type Row = {
    contact_id: string;
    phone: string;
    group_id: string;
  };

  return data.map((row: Row) => ({
    id: row.contact_id,
    phone: row.phone,
    group_id: row.group_id,
  }));
}
