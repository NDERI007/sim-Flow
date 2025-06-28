'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useAuthStore } from '../lib/AuthStore';

export default function RegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const { accessToken } = useAuthStore();

  const [senderId, setSenderId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        '/api/verify-handler',
        { token, senderId, password },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (response.status === 200) {
        router.push('/admin');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-xl bg-zinc-800 p-8 shadow-xl"
      >
        <h2 className="text-center text-2xl font-bold text-pink-900">
          Complete Registration
        </h2>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <input
          type="email"
          value={email}
          readOnly
          className="w-full rounded bg-zinc-700 px-3 py-2 text-white placeholder-gray-400 outline-none"
        />

        <input
          type="text"
          placeholder="Sender ID (cannot be changed later)"
          value={senderId}
          onChange={(e) => setSenderId(e.target.value)}
          required
          className="w-full rounded bg-zinc-700 px-3 py-2 text-white placeholder-gray-400 outline-none"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded bg-zinc-700 px-3 py-2 text-white placeholder-gray-400 outline-none"
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
