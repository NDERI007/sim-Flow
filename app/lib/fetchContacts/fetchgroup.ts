import { createClient } from '@supabase/supabase-js';

export async function fetchGroupContacts(
  groupIds: string[],
  accessToken: string,
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: { persistSession: false },
    },
  );

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
//SELECT 1 is a convention used in EXISTS clauses to efficiently check if a row exists without retrieving full data.
