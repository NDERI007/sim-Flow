'use client';

import { useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';

export default function SetupMfa({ onNext }: { onNext: () => void }) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMfaSetup = async () => {
      try {
        const { data } = await axios.post('/api/mfa-setup');
        setQrCode(data.qrCode);
        setSecret(data.secret);
      } catch (err) {
        const error = err as AxiosError<{ error: string }>;
        setError(error.response?.data?.error || 'Failed to load QR code');
      } finally {
        setLoading(false);
      }
    };

    fetchMfaSetup();
  }, []);

  if (loading) {
    return (
      <div className="rounded bg-gray-900 p-6 text-gray-300">
        Setting up MFA...
      </div>
    );
  }

  if (error) {
    return <div className="rounded bg-gray-900 p-6 text-red-400">{error}</div>;
  }

  return (
    <div className="rounded-lg bg-slate-900 p-6 text-gray-200 shadow-lg">
      <h2 className="mb-4 text-xl font-semibold text-white">
        Enable Two-Factor Authentication
      </h2>
      <p className="mb-3 text-sm text-gray-400">
        Scan the QR code below using your Authenticator app (e.g., Google
        Authenticator, Authy). After scanning, you’ll be asked to enter a
        6-digit code to verify.
      </p>

      {qrCode && (
        <div className="flex flex-col items-center space-y-4">
          <img
            src={qrCode}
            alt="MFA QR Code"
            className="h-48 w-48 rounded-md border border-slate-700"
          />
          <p className="text-sm text-gray-400">Or enter this code manually:</p>
          <code className="rounded bg-gray-800 px-3 py-1 text-sm text-indigo-400">
            {secret}
          </code>
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
        >
          Next
        </button>
      </div>
    </div>
  );
}
