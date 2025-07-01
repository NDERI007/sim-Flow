'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'error'>(
    'idle',
  );
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('checking');

    try {
      const res = await axios.post('/api/verify-otp', { email, otp });
      if (res.data?.ok) {
        router.push(`/finish?email=${encodeURIComponent(email)}`);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleResend = async () => {
    try {
      await axios.post('/api/resend-handler', { email });
      setResendSuccess(true);
      setCooldown(60);
    } catch {
      console.error('Resend failed');
    }
  };

  useEffect(() => {
    if (cooldown === 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  return (
    <div className="mx-auto mt-10 max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Verify your email</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded bg-gray-100 px-3 py-2"
            placeholder="Enter your email"
            required
          />
        </div>
        <div>
          <label>OTP</label>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="Enter the OTP sent to your email"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-500"
        >
          Verify
        </button>
      </form>

      {status === 'error' && (
        <p className="text-red-600">Invalid or expired OTP.</p>
      )}

      {resendSuccess ? (
        <p className="text-green-600">A new OTP has been sent to your email.</p>
      ) : (
        <button
          onClick={handleResend}
          disabled={cooldown > 0 || !email}
          className={`mt-4 w-full rounded py-2 ${
            cooldown > 0
              ? 'cursor-not-allowed bg-gray-400'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
        </button>
      )}
    </div>
  );
}
