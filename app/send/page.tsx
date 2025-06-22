'use client';

import { useEffect, useReducer, useCallback, useMemo, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { supabase } from '@/app/lib/supabase';

// Define constants
const SMS_SEGMENT_LENGTH = 160;
const LARGE_BATCH_THRESHOLD = 50;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    switch (status) {
      case 429:
        return 'Rate limit exceeded. Please try again in a few minutes.';
      case 402:
        return 'Insufficient credits. Please add more quota to continue.';
      case 400:
        return message || 'Invalid request. Please check your input.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return (
          message || 'Network error occurred. Please check your connection.'
        );
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

// Interfaces
interface ContactGroup {
  id: string;
  name: string;
  numbers: string[];
}

// REFACTORED: UserData no longer includes quota
interface UserData {
  groups: ContactGroup[];
}

interface ValidationResult {
  validNumbers: string[];
  totalRecipients: number;
  messageSegments: number;
  totalSegments: number;
}

// State Management
interface AppState {
  manualNumbers: string;
  message: string;
  selectedGroupIds: string[];
  userData: UserData; // Updated
  status: 'idle' | 'loading' | 'success' | 'error';
  isSubmitting: boolean;
  isLoadingUserData: boolean;
  error: string;
  inputMethod: 'manual' | 'groups' | 'both';
  showConfirmation: boolean;
  validationResult: ValidationResult | null;
}

type AppAction =
  | { type: 'SET_INPUT_METHOD'; payload: AppState['inputMethod'] }
  | { type: 'SET_MANUAL_NUMBERS'; payload: string }
  | { type: 'SET_MESSAGE'; payload: string }
  | { type: 'TOGGLE_GROUP'; payload: string }
  | { type: 'SET_USER_DATA'; payload: UserData }
  | { type: 'SET_LOADING_USER_DATA'; payload: boolean }
  | {
      type: 'SET_STATUS';
      payload: { status: AppState['status']; error?: string };
    }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_VALIDATION_RESULT'; payload: ValidationResult | null }
  | { type: 'SHOW_CONFIRMATION'; payload: boolean }
  | { type: 'RESET_FORM' };

// REFACTORED: initialState no longer includes quota
const initialState: AppState = {
  manualNumbers: '',
  message: '',
  selectedGroupIds: [],
  userData: { groups: [] },
  status: 'idle',
  isSubmitting: false,
  isLoadingUserData: true,
  error: '',
  inputMethod: 'manual',
  showConfirmation: false,
  validationResult: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_INPUT_METHOD':
      return { ...state, inputMethod: action.payload };
    case 'SET_MANUAL_NUMBERS':
      return { ...state, manualNumbers: action.payload };
    case 'SET_MESSAGE':
      return { ...state, message: action.payload };
    case 'TOGGLE_GROUP': {
      const groupId = action.payload;
      const isSelected = state.selectedGroupIds.includes(groupId);
      const newSelectedGroupIds = isSelected
        ? state.selectedGroupIds.filter((id) => id !== groupId)
        : [...state.selectedGroupIds, groupId];
      return { ...state, selectedGroupIds: newSelectedGroupIds };
    }
    case 'SET_USER_DATA':
      return { ...state, userData: action.payload };
    case 'SET_LOADING_USER_DATA':
      return { ...state, isLoadingUserData: action.payload };
    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload.status,
        error: action.payload.error || '',
      };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    case 'SET_VALIDATION_RESULT':
      return { ...state, validationResult: action.payload };
    case 'SHOW_CONFIRMATION':
      return { ...state, showConfirmation: action.payload };
    case 'RESET_FORM':
      return {
        ...state,
        manualNumbers: '',
        message: '',
        selectedGroupIds: [],
        status: 'idle',
        error: '',
        isSubmitting: false,
        showConfirmation: false,
        validationResult: null,
      };
    default:
      return state;
  }
};

// Custom hooks
// REFACTORED: useUserData no longer fetches quota
const useUserData = () => {
  const [userData, setUserData] = useState<UserData>({
    groups: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setUserData({ groups: [] });
          return;
        }

        const { data, error } = await supabase
          .from('contact_groups')
          .select('*')
          .eq('user_id', user.id)
          .order('name');

        if (error) throw error;

        setUserData({
          groups: data || [],
        });
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        setError(getErrorMessage(err));
        setUserData({ groups: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return { userData, loading, error };
};

// Components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

const InputMethodSelector = ({
  inputMethod,
  onMethodChange,
}: {
  inputMethod: string;
  onMethodChange: (method: 'manual' | 'groups' | 'both') => void;
}) => {
  const methods = [
    { key: 'manual' as const, label: 'Manual Entry', icon: '📝' },
    { key: 'groups' as const, label: 'Contact Groups', icon: '👥' },
    { key: 'both' as const, label: 'Both', icon: '🔄' },
  ];

  return (
    <div>
      <label className="mb-3 block text-sm font-medium text-gray-700">
        Choose Recipients Method
      </label>
      <div className="flex flex-wrap gap-3">
        {methods.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onMethodChange(key)}
            className={`flex items-center rounded-lg px-4 py-2 font-medium transition-all duration-200 ${
              inputMethod === key
                ? 'scale-105 bg-purple-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:scale-102 hover:bg-gray-200'
            }`}
          >
            <span className="mr-2">{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

const ContactGroupSelector = ({
  groups,
  selectedGroupIds,
  onToggleGroup,
}: {
  groups: ContactGroup[];
  selectedGroupIds: string[];
  onToggleGroup: (groupId: string) => void;
}) => {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl bg-gray-50 py-8 text-center">
        <div className="mb-2 text-4xl">📋</div>
        <p className="font-medium text-gray-500">No contact groups available</p>
        <p className="mt-1 text-sm text-gray-400">
          Create groups first to use this feature
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => {
        const isSelected = selectedGroupIds.includes(group.id);
        return (
          <label
            key={group.id}
            className={`flex cursor-pointer items-center rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
              isSelected
                ? 'border-purple-500 bg-purple-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleGroup(group.id)}
              className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
            />
            <div className="ml-3">
              <div className="font-medium text-gray-900">{group.name}</div>
              <div className="text-sm text-gray-500">
                {group.numbers.length} contact
                {group.numbers.length !== 1 ? 's' : ''}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
};

// REFACTORED: This component no longer shows quota information.
const ValidationSummary = ({
  validationResult,
}: {
  validationResult: ValidationResult | null;
}) => {
  if (!validationResult || validationResult.totalRecipients === 0) return null;

  const { totalRecipients, totalSegments } = validationResult;

  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <h3 className="mb-3 flex items-center font-medium text-gray-800">
        <span className="mr-2">📊</span>
        Summary
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Recipients:</span>
          <span className="ml-2 font-medium text-green-600">
            {totalRecipients}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Total segments:</span>
          <span className="ml-2 font-medium">{totalSegments}</span>
        </div>
      </div>
    </div>
  );
};

const ConfirmationModal = ({
  isOpen,
  onConfirm,
  onCancel,
  validationResult,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  validationResult: ValidationResult | null;
}) => {
  if (!isOpen || !validationResult) return null;

  const { totalRecipients, totalSegments } = validationResult;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 className="mb-4 flex items-center text-lg font-bold text-gray-900">
          <span className="mr-2">⚠️</span>
          Confirm Large SMS Batch
        </h3>
        <div className="mb-6 space-y-2 text-sm text-gray-600">
          <p>You're about to send:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>
              <strong>{totalRecipients}</strong> recipients
            </li>
            <li>
              <strong>{totalSegments}</strong> SMS segments
            </li>
          </ul>
          <p className="mt-3 text-yellow-600">
            This may consume significant quota. Are you sure you want to
            continue?
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
          >
            Send SMS
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SendSmsPage() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const {
    userData,
    loading: userDataLoading,
    error: userDataError,
  } = useUserData();

  useEffect(() => {
    dispatch({ type: 'SET_USER_DATA', payload: userData });
    dispatch({ type: 'SET_LOADING_USER_DATA', payload: userDataLoading });
  }, [userData, userDataLoading]);

  const validationResult = useMemo((): ValidationResult | null => {
    let allNumbers: string[] = [];

    if (state.manualNumbers.trim()) {
      const manual = state.manualNumbers
        .split(/[,\n]+/)
        .map((num) => num.trim())
        .filter(Boolean);
      allNumbers.push(...manual);
    }

    state.selectedGroupIds.forEach((groupId) => {
      const group = state.userData.groups.find((g) => g.id === groupId);
      if (group) {
        allNumbers.push(...group.numbers);
      }
    });

    if (allNumbers.length === 0 && !state.message.trim()) {
      return null;
    }

    const validNumbers = Array.from(new Set(allNumbers));
    const messageSegments =
      Math.ceil(state.message.length / SMS_SEGMENT_LENGTH) || 1;
    const totalSegments = validNumbers.length * messageSegments;

    return {
      validNumbers,
      totalRecipients: validNumbers.length,
      messageSegments,
      totalSegments,
    };
  }, [
    state.manualNumbers,
    state.selectedGroupIds,
    state.message,
    state.userData.groups,
  ]);

  useEffect(() => {
    dispatch({ type: 'SET_VALIDATION_RESULT', payload: validationResult });
  }, [validationResult]);

  // Event handlers
  // REFACTORED: handleSubmit no longer performs quota validation
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validationResult) return;

      const { validNumbers, totalRecipients, totalSegments } = validationResult;

      if (totalRecipients === 0) {
        dispatch({
          type: 'SET_STATUS',
          payload: {
            status: 'error',
            error: '❌ Please add at least one recipient.',
          },
        });
        return;
      }

      if (!state.message.trim()) {
        dispatch({
          type: 'SET_STATUS',
          payload: { status: 'error', error: '❌ Please enter a message.' },
        });
        return;
      }

      if (totalSegments >= LARGE_BATCH_THRESHOLD) {
        dispatch({ type: 'SHOW_CONFIRMATION', payload: true });
        return;
      }

      await sendSMS(validNumbers);
    },
    [validationResult, state.message],
  );

  const sendSMS = useCallback(
    async (recipients: string[]) => {
      dispatch({ type: 'SET_SUBMITTING', payload: true });
      dispatch({ type: 'SET_STATUS', payload: { status: 'loading' } });

      try {
        await axios.post('/api/send-sms', {
          to_numbers: recipients,
          message: state.message,
        });

        dispatch({ type: 'SET_STATUS', payload: { status: 'success' } });
        dispatch({ type: 'RESET_FORM' });
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        dispatch({
          type: 'SET_STATUS',
          payload: { status: 'error', error: errorMessage },
        });
      } finally {
        dispatch({ type: 'SET_SUBMITTING', payload: false });
        dispatch({ type: 'SHOW_CONFIRMATION', payload: false });
      }
    },
    [state.message],
  );

  const handleConfirmSend = useCallback(() => {
    if (validationResult) {
      sendSMS(validationResult.validNumbers);
    }
  }, [validationResult, sendSMS]);

  const handleCancelConfirmation = useCallback(() => {
    dispatch({ type: 'SHOW_CONFIRMATION', payload: false });
  }, []);

  const showManualInput =
    state.inputMethod === 'manual' || state.inputMethod === 'both';
  const showGroupInput =
    state.inputMethod === 'groups' || state.inputMethod === 'both';
  const canSubmit =
    validationResult &&
    validationResult.totalRecipients > 0 &&
    state.message.trim();

  if (userDataError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center">
          <div className="mb-4 text-4xl">❌</div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            Failed to Load Data
          </h2>
          <p className="mb-4 text-gray-600">{userDataError}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 flex items-center justify-center text-4xl font-bold text-gray-800">
            <span className="mr-3">📱</span>
            Send SMS
          </h1>
          <p className="text-gray-600">
            Send messages to your contacts individually or in groups
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
          {state.isLoadingUserData ? (
            <LoadingSpinner />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <InputMethodSelector
                inputMethod={state.inputMethod}
                onMethodChange={(method) =>
                  dispatch({ type: 'SET_INPUT_METHOD', payload: method })
                }
              />

              {showManualInput && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Phone Numbers
                  </label>
                  <textarea
                    value={state.manualNumbers}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_MANUAL_NUMBERS',
                        payload: e.target.value,
                      })
                    }
                    placeholder="Enter phone numbers (comma or newline separated)"
                    className="h-24 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {showGroupInput && (
                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-700">
                    Select Contact Groups
                  </label>
                  <ContactGroupSelector
                    groups={state.userData.groups}
                    selectedGroupIds={state.selectedGroupIds}
                    onToggleGroup={(groupId) =>
                      dispatch({ type: 'TOGGLE_GROUP', payload: groupId })
                    }
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  value={state.message}
                  onChange={(e) =>
                    dispatch({ type: 'SET_MESSAGE', payload: e.target.value })
                  }
                  placeholder="Type your message here..."
                  className="h-32 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  required
                />
                <div className="mt-2 flex justify-between text-sm text-gray-500">
                  <span>{state.message.length} characters</span>
                  <span>
                    {validationResult?.messageSegments || 1} segment
                    {(validationResult?.messageSegments || 1) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <ValidationSummary validationResult={validationResult} />

              <button
                type="submit"
                className="w-full transform rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-purple-700 hover:to-pink-700 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                disabled={
                  !canSubmit || state.status === 'loading' || state.isSubmitting
                }
              >
                {state.isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Sending SMS...
                  </div>
                ) : (
                  `Send SMS to ${validationResult?.totalRecipients || 0} recipient${
                    (validationResult?.totalRecipients || 0) !== 1 ? 's' : ''
                  }`
                )}
              </button>

              <div>
                {state.status === 'success' && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <p className="flex items-center justify-center text-center font-medium text-green-700">
                      <span className="mr-2">✅</span>
                      Message sent successfully!
                    </p>
                  </div>
                )}
                {state.status === 'error' && state.error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-center font-medium text-red-700">
                      {state.error}
                    </p>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        <ConfirmationModal
          isOpen={state.showConfirmation}
          onConfirm={handleConfirmSend}
          onCancel={handleCancelConfirmation}
          validationResult={validationResult}
        />
      </div>
    </div>
  );
}
