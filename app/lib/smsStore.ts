// store/smsStore.ts
import { create } from 'zustand';

export type Contact = {
  name: string;
  phone: string;
};

export type ContactGroup = {
  id: string;
  group_name: string;
  contacts: Contact[];
};

interface SmsState {
  manualNumbers: string;
  selectedGroup: ContactGroup[];
  message: string;

  isSubmitting: boolean;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;

  setManualNumbers: (numbers: string) => void;
  toggleGroup: (group: ContactGroup) => void;
  setMessage: (message: string) => void;

  setStatus: (status: SmsState['status'], error?: string | null) => void;
  setSubmitting: (submitting: boolean) => void;
  resetForm: () => void;
}

export const useSmsStore = create<SmsState>((set) => ({
  manualNumbers: '',
  selectedGroup: [],
  message: '',
  isSubmitting: false,
  status: 'idle',
  error: null,

  setManualNumbers: (numbers) => set({ manualNumbers: numbers }),
  toggleGroup: (group) =>
    set((state) => {
      const exists = state.selectedGroup.some((g) => g.id === group.id);
      return {
        selectedGroup: exists
          ? state.selectedGroup.filter((g) => g.id !== group.id)
          : [...state.selectedGroup, group],
      };
    }),
  setMessage: (message) => set({ message }),
  setStatus: (status, error = null) => set({ status, error }),
  setSubmitting: (submitting) => set({ isSubmitting: submitting }),
  resetForm: () =>
    set({
      manualNumbers: '',
      selectedGroup: [],
      message: '',
      isSubmitting: false,
      status: 'idle',
      error: null,
    }),
}));
