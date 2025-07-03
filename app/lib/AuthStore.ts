import { create } from 'zustand';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;

  getUser: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  supabase.auth.onAuthStateChange((_event, session) => {
    set({
      user: session?.user ?? null,
      accessToken: session?.access_token ?? null,
      loading: false,
      error: null,
    });
    if (session?.user) {
      get().fetchUserProfile();
    }
  });

  return {
    user: null,
    accessToken: null,
    loading: true,
    error: null,

    getUser: async () => {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        set({
          user: null,
          accessToken: null,
          error: error?.message ?? 'No session',
          loading: false,
        });
      } else {
        set({
          user: data.session.user,
          accessToken: data.session.access_token,
          error: null,
          loading: false,
        });
        await get().fetchUserProfile();
      }
    },

    fetchUserProfile: async () => {
      const { user } = get();
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (data?.name) {
        set((state) => ({
          user: {
            ...state.user!,
            user_metadata: {
              ...state.user?.user_metadata,
              name: data.name,
            },
          },
        }));
      }
    },

    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        set({ error: error.message });
      } else {
        set({ user: null, accessToken: null, error: null });
      }
    },
  };
});
