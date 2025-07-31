'use client';

import { useState, useRef } from 'react';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';

export default function MfaVerifyPage() {
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [backupCode, setBackupCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = useBackup ? backupCode.trim() : digits.join('');

    if (useBackup && !code) {
      setError('Enter your backup code');
      return;
    }

    if (!useBackup && code.length !== 6) {
      setError('Enter all 6 digits');
      return;
    }

    setVerifying(true);
    setError('');
    try {
      const res = await axios.post('/api/mfa/login-verify', {
        code,
        type: useBackup ? 'backup' : 'totp',
      });

      if (res.data.success) {
        router.replace('/dashboard');
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-white">
      <h1 className="mb-4 text-xl font-semibold">
        {useBackup ? 'Use a backup code' : 'Enter your 6-digit MFA code'}
      </h1>

      {!useBackup ? (
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
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className="h-12 w-10 rounded-md bg-gray-800 text-center text-xl text-white ring-1 ring-zinc-600 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={backupCode}
          onChange={(e) => setBackupCode(e.target.value)}
          className="w-full max-w-sm rounded-md bg-gray-800 p-3 text-white ring-1 ring-zinc-600 focus:ring-2 focus:ring-indigo-500"
        />
      )}

      <button
        onClick={handleVerify}
        disabled={verifying}
        className="mt-4 rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {verifying ? 'Verifying...' : 'Verify'}
      </button>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <button
        onClick={() => {
          setError('');
          setUseBackup(!useBackup);
          setDigits(Array(6).fill(''));
          setBackupCode('');
        }}
        className="mt-4 text-sm text-indigo-400 underline hover:text-indigo-300"
      >
        {useBackup
          ? 'Use authentication code instead'
          : 'Use backup code instead'}
      </button>
    </div>
  );
}
