import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  userName: string | null;
  loading: boolean;
  error: string | null;

  getUser: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      userName: null,
      loading: true,
      error: null,

      getUser: async () => {
        const state = get();

        if (state.user && state.accessToken && state.userName) return; // ✅ prevent refetch

        set({ loading: true, error: null });
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          set({
            user: null,
            accessToken: null,
            userName: null,
            error: error?.message ?? 'No session',
            loading: false,
          });
        } else {
          set({
            user: data.session.user,
            accessToken: data.session.access_token,
            loading: false,
            error: null,
          });

          await get().fetchUserProfile();
        }
      },

      fetchUserProfile: async () => {
        const { user, userName } = get();
        if (!user || userName) return; // ✅ already fetched

        const { data } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single();

        if (data?.name) {
          set({ userName: data.name });
        }
      },

      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          set({ error: error.message });
        } else {
          set({
            user: null,
            accessToken: null,
            userName: null,
            error: null,
          });
        }
      },
    }),
    {
      name: 'auth-storage', // 🔒 name of localStorage key
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        userName: state.userName,
      }),
    },
  ),
);
