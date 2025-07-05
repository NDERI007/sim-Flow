import { useMemo } from 'react';
import useSWR from 'swr';
import { supabase } from './supabase';
import type { ContactGroup } from './smsStore';

export async function deleteContactGroup(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('contact_groups').delete().eq('id', id);

  if (error) {
    console.error('Delete failed:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export function useGroupedContacts() {
  const {
    data: flatData,
    error,
    isLoading,
  } = useSWR(
    'rpc:contacts-with-groups',
    async () => {
      const { data, error } = await supabase.rpc(
        'get_user_contacts_with_groups',
      );

      if (error) throw error;
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const grouped: ContactGroup[] = useMemo(() => {
    if (!flatData) return [];

    const map = new Map<string, ContactGroup>();

    for (const row of flatData) {
      if (!map.has(row.group_id)) {
        map.set(row.group_id, {
          id: row.group_id,
          group_name: row.group_name,
          contacts: [],
        });
      }

      map.get(row.group_id)!.contacts.push({
        name: row.name,
        phone: row.phone,
      });
    }

    return Array.from(map.values()).map((group) => ({
      ...group,
      contacts: group.contacts.sort((a, b) =>
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
      ),
    }));
  }, [flatData]);

  return { groups: grouped, error, isLoading };
}
