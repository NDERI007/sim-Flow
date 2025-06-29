import { useMemo } from 'react';
import useSWR from 'swr';
import { supabase } from './supabase';

export type GroupWithContacts = {
  group_name: string;
  contacts: {
    name: string;
    phone: string;
  }[];
};
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
    'contacts-with-groups',
    async () => {
      const { data, error } = await supabase
        .from('contacts_with_groups')
        .select('*');
      if (error) throw error;
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const grouped: GroupWithContacts[] = useMemo(() => {
    if (!flatData) return [];

    const map = new Map<string, GroupWithContacts>();

    for (const row of flatData) {
      if (!map.has(row.group_name)) {
        map.set(row.group_name, {
          group_name: row.group_name,
          contacts: [],
        });
      }

      map.get(row.group_name)!.contacts.push({
        name: row.contact_name,
        phone: row.contact_phone,
      });
    }

    // Sort contacts inside each group
    const sortedGroups = Array.from(map.values()).map((group) => ({
      ...group,
      contacts: group.contacts.sort((a, b) =>
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
      ),
    }));

    // Sort groups by name
    return sortedGroups.sort((a, b) =>
      a.group_name.localeCompare(b.group_name, 'en', { sensitivity: 'base' }),
    );
  }, [flatData]);

  return { groups: grouped, error, isLoading };
}
