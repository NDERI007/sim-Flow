import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase/BrowserClient';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  initialized: boolean;
  hydrated: boolean;
  error: string | null;
  lastAuthAt: string | null;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  initialized: false,
  hydrated: false,
  error: null,
  lastAuthAt: null,

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ error: error.message });
    } else {
      set({
        user: null,
        accessToken: null,
        error: null,
        initialized: true,
        hydrated: true,
        lastAuthAt: null,
      });
    }
  },
}));
