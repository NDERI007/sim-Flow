import { supabase } from './supabase';
import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';

export function useUserData() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) setUser(data.user);
      setLoading(false);
    };

    getUser();
  }, []);

  return { user, loading };
}
