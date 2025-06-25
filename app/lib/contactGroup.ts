import useSWR, { mutate } from 'swr';
import { supabase } from '@/app/lib/supabase';
import { type ContactGroup } from '@/app/lib/smsStore';
import { useAuthStore } from './AuthStore';
import { User } from '@supabase/supabase-js';

const fetchContactGroups = async (user: User): Promise<ContactGroup[]> => {
  const { data, error } = await supabase
    .from('contact_groups')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;

  return data;
};

export function useContactGroups() {
  const user = useAuthStore((state) => state.user);
  const shouldFetch = !!user;
  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch ? 'contact-groups' : null,
    () => fetchContactGroups(user!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  return {
    groups: data,
    error,
    isLoading,
    mutate,
  };
}

export const refreshContactGroups = () => mutate('contact-groups');
