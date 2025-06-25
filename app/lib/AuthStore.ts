import { create } from 'zustand';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  getUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  // Auth state change listener
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;
    set({ user, loading: false, error: null });
  });

  return {
    user: null,
    loading: true,
    error: null,

    // Fetch user manually
    getUser: async () => {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        set({ user: null, error: error.message, loading: false });
      } else {
        set({ user: data.user, error: null, loading: false });
      }
    },

    // Sign out user
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        set({ error: error.message });
      } else {
        set({ user: null, error: null });
      }
    },
  };
});
