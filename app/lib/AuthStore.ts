import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase'; // your Supabase client
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
        const state = get();

        if (state.user && state.accessToken && state.userName) {
          set({ initialized: true });
          return;
        }

        set({ loading: true, error: null });

        const { data, error } = await supabase.auth.getSession(); //

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
          await get().fetchUserProfile();
        }
      },

      fetchUserProfile: async () => {
        const { user, userName } = get();
        if (!user || (typeof userName === 'string' && userName.trim() !== ''))
          return;

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
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        userName: state.userName,
      }),
      storage:
        typeof window !== 'undefined'
          ? {
              getItem: (name) =>
                Promise.resolve(
                  JSON.parse(window.localStorage.getItem(name) || 'null'),
                ),
              setItem: (name, value) => {
                window.localStorage.setItem(name, JSON.stringify(value));
              },
              removeItem: (name) => {
                window.localStorage.removeItem(name);
              },
            }
          : undefined,
      // SSR-safe
      onRehydrateStorage: () => () => {
        // Called after rehydration
        const set = useAuthStore.getState().hydrated;
        if (!set) useAuthStore.setState({ hydrated: true });
      },
    },
  ),
);
