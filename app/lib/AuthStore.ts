import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  userName: string | null;
  loading: boolean;
  initialized: boolean;
  hydrated: boolean;
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
      hydrated: false,
      error: null,
      initialized: false,

      getUser: async () => {
        const { userName } = get();
        set({ loading: true, error: null });

        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          set({
            user: null,
            accessToken: null,
            userName: null,
            error: error?.message ?? 'No session found',
            loading: false,
            initialized: false,
          });
        } else {
          set({
            user: data.session.user,
            accessToken: data.session.access_token,
            loading: false,
            error: null,
            initialized: true,
          });

          if (!userName) {
            await get().fetchUserProfile();
          }
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
            initialized: false,
            hydrated: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        userName: state.userName,
      }),
      storage:
        typeof window !== 'undefined'
          ? {
              getItem: async (name) =>
                JSON.parse(localStorage.getItem(name) || 'null'),
              setItem: async (name, value) =>
                localStorage.setItem(name, JSON.stringify(value)),
              removeItem: async (name) => localStorage.removeItem(name),
            }
          : undefined,
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hydrated: true });
      },
    },
  ),
);
