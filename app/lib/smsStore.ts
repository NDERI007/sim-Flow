// store/smsStore.ts
import { create } from 'zustand';

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

export type InputMethod = 'manual' | 'groups' | 'both';

interface SmsState {
  inputMethod: InputMethod;
  manualNumbers: string;
  selectedGroup: ContactGroup[];
  message: string;
  validationResult: ValidationResult | null;
  isSubmitting: boolean;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;

  setInputMethod: (method: InputMethod) => void;
  setManualNumbers: (numbers: string) => void;
  toggleGroup: (group: ContactGroup) => void;
  setMessage: (message: string) => void;
  setValidationResult: (result: ValidationResult | null) => void;
  setStatus: (status: SmsState['status'], error?: string | null) => void;
  setSubmitting: (submitting: boolean) => void;
  resetForm: () => void;
}

export const useSmsStore = create<SmsState>((set) => ({
  inputMethod: 'manual',
  manualNumbers: '',
  selectedGroup: [],
  message: '',
  validationResult: null,
  isSubmitting: false,
  status: 'idle',
  error: null,

  setInputMethod: (method) => set({ inputMethod: method }),
  setManualNumbers: (numbers) => set({ manualNumbers: numbers }),
  toggleGroup: (group) =>
    set((state) => {
      const exists = state.selectedGroup.includes(group);
      return {
        selectedGroup: exists
          ? state.selectedGroup.filter((g) => g.id !== group.id)
          : [...state.selectedGroup, group],
      };
    }),
  setMessage: (message) => set({ message }),
  setValidationResult: (result) => set({ validationResult: result }),
  setStatus: (status, error = null) => set({ status, error }),
  setSubmitting: (submitting) => set({ isSubmitting: submitting }),
  resetForm: () =>
    set({
      manualNumbers: '',
      selectedGroup: [],
      message: '',
      validationResult: null,
      isSubmitting: false,
      status: 'idle',
      error: null,
    }),
}));
