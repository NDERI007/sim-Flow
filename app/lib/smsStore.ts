// store/smsStore.ts
import { create } from 'zustand';
import { supabase } from './supabase';

export interface ValidationResult {
  validNumbers: string[];
  totalRecipients: number;
  messageSegments: number;
  totalSegments: number;
}

export type ContactGroup = {
  id: string;
  name: string;
  contacts: string[];
};

type ContactGroupStore = {
  groups: ContactGroup[];
  loading: boolean;
  error: string | null;
  fetchGroups: (userId: string) => Promise<void>;
  addOrUpdateGroup: (group: ContactGroup) => void;
  removeGroup: (id: string) => void;
  clearContactGroups: () => void;
};

export const useContactGroupStore = create<ContactGroupStore>((set, get) => ({
  groups: [],
  loading: false,
  error: null,
  fetchGroups: async (userId) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('contact_groups')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      set({ error: error.message, loading: false });
    } else {
      set({ groups: data, loading: false });
    }
  },
  addOrUpdateGroup: (group) => {
    const existing = get().groups;
    const updated = existing.some((g) => g.id === group.id)
      ? existing.map((g) => (g.id === group.id ? group : g))
      : [group, ...existing];
    set({ groups: updated });
  },

  removeGroup: (id) => {
    set({
      groups: get().groups.filter((g) => g.id !== id),
    });
  },

  clearContactGroups: () => set({ groups: [] }),
}));

type InputMethod = 'manual' | 'groups' | 'both';

interface SmsState {
  inputMethod: InputMethod;
  manualNumbers: string;
  selectedGroupIds: string[];
  message: string;
  validationResult: ValidationResult | null;
  isSubmitting: boolean;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  contactGroups: ContactGroup[];

  setInputMethod: (method: InputMethod) => void;
  setManualNumbers: (numbers: string) => void;
  toggleGroup: (groupId: string) => void;
  setMessage: (message: string) => void;
  setValidationResult: (result: ValidationResult | null) => void;
  setStatus: (status: SmsState['status'], error?: string | null) => void;
  setSubmitting: (submitting: boolean) => void;
  resetForm: () => void;
  setContactGroups: (groups: ContactGroup[]) => void;
}

export const useSmsStore = create<SmsState>((set) => ({
  inputMethod: 'manual',
  manualNumbers: '',
  selectedGroupIds: [],
  message: '',
  validationResult: null,
  isSubmitting: false,
  status: 'idle',
  error: null,
  contactGroups: [],

  setInputMethod: (method) => set({ inputMethod: method }),
  setManualNumbers: (numbers) => set({ manualNumbers: numbers }),
  toggleGroup: (groupId) =>
    set((state) => {
      const exists = state.selectedGroupIds.includes(groupId);
      return {
        selectedGroupIds: exists
          ? state.selectedGroupIds.filter((id) => id !== groupId)
          : [...state.selectedGroupIds, groupId],
      };
    }),
  setMessage: (message) => set({ message }),
  setValidationResult: (result) => set({ validationResult: result }),
  setStatus: (status, error = null) => set({ status, error }),
  setSubmitting: (submitting) => set({ isSubmitting: submitting }),
  resetForm: () =>
    set({
      manualNumbers: '',
      selectedGroupIds: [],
      message: '',
      validationResult: null,
      isSubmitting: false,
      status: 'idle',
      error: null,
    }),
  setContactGroups: (groups) => set({ contactGroups: groups }),
}));
