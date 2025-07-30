'use client';

import { useRef, useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { supabase } from '../../lib/supabase/BrowserClient';
import { RecoveryCodesModal } from './codeRecModal';

export default function VerifyMfa({ onComplete }: { onComplete: () => void }) {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [error, setError] = useState('');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleClose = useCallback(() => {
    setShowRecoveryModal(false);
    onComplete();
  }, [onComplete]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Enter all 6 digits');
      return;
    }

    setVerifying(true);
    setError('');
    try {
      const res = await axios.post('/api/mfa/verify-setup', { code });
      if (res.data.success) {
        setVerified(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('recovery_codes_generated')
            .eq('id', user.id)
            .single();

          if (!error && data?.recovery_codes_generated === false) {
            setShowRecoveryModal(true);
          }
        }
      } else {
        setError('Invalid or expired code');
      }
    } catch (err: unknown) {
      const error = err as AxiosError<{ error: string }>;
      setError(error.response?.data?.error || 'Failed to verify');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <div className="flex gap-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            disabled={verified}
            onChange={(e) => handleChange(e.target.value, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className="h-12 w-10 rounded-md bg-gray-800 text-center text-xl text-white ring-1 ring-zinc-600 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ))}
      </div>

      {!verified ? (
        <>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Verify'}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </>
      ) : (
        <p className="font-medium text-green-400">MFA setup complete!</p>
      )}

      {showRecoveryModal && <RecoveryCodesModal onClose={handleClose} />}
    </div>
  );
}
