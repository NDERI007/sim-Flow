'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
export default function FinishRegistrationPage() {
  const router = useRouter();
  const [senderId, setSenderId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ Create client locally — guaranteed clean instance
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(
        '/api/complete-registration',
        {
          sender_id: senderId,
          password,
        },
        {
          withCredentials: true,
        },
      );
      const session = res.data?.session;

      if (session?.access_token && session?.refresh_token) {
        // Sync client session state
        const { error: setError } = await supabase.auth.setSession(session);
        if (setError) throw new Error(setError.message);

        // Navigate after session is hydrated
        router.push('/admin');
      } else {
        throw new Error('No session returned.');
      }
      // Navigate after session is hydrated
      router.push('/admin');
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
          type="text"
          placeholder="Sender ID (cannot be changed later)"
          value={senderId}
          onChange={(e) => setSenderId(e.target.value)}
          required
          className="w-full rounded bg-zinc-700 px-3 py-2 text-white"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded bg-zinc-700 px-3 py-2 text-white"
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
