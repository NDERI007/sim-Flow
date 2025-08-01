'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { SenderIdInfo } from '../components/senderModal';

export default function FinishRegistrationPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(
        '/api/register/finalize',
        {
          password,
        },
        {
          withCredentials: true,
        },
      );

      if (res.status === 200) {
        router.push('/dashboard');
      } else {
        throw new Error(res.data?.error || 'Registration Failed');
      }
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : err instanceof Error
          ? err.message
          : 'Registration failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-xl bg-gray-800 p-8 shadow-xl"
      >
        <h2 className="text-center text-2xl font-semibold text-gray-300">
          Complete Registration
        </h2>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <SenderIdInfo />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded bg-gray-700 px-3 py-2 text-white focus:outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-pink-900 py-2 text-white hover:bg-pink-800"
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </main>
  );
}
