import useSWR, { mutate } from 'swr';
import { supabase } from '@/app/lib/supabase';
import { type ContactGroup } from '@/app/lib/smsStore';

const fetchContactGroups = async (): Promise<ContactGroup[]> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('contact_groups')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;

  return data;
};

export function useContactGroups() {
  const { data, error, isLoading, mutate } = useSWR(
    'contact-groups',
    fetchContactGroups,
  );

  return {
    groups: data,
    error,
    isLoading,
    mutate,
  };
}

export const refreshContactGroups = () => mutate('contact-groups');
