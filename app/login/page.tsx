'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase/BrowserClient';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Unexpected error logging in');
      return;
    }

    const { data: userRow, error: fetchError } = await supabase
      .from('users')
      .select('mfa_enabled')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      setError('Failed to verify MFA status');
      return;
    }

    if (userRow?.mfa_enabled) {
      // Redirect to MFA verification
      router.push('mfa/verify');
    } else {
      // No MFA, proceed normally
      const { data: roleRow, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (roleError) {
        setError('Failed to fetch user role');
        return;
      }

      if (roleRow?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-6 rounded-xl bg-gray-800 p-8 shadow-lg"
      >
        <h2 className="text-center text-2xl font-semibold text-gray-300">
          Login
        </h2>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <div className="space-y-2">
          <label
            className="block text-sm font-medium text-gray-300"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-sm text-white placeholder-gray-400 focus:border-fuchsia-700 focus:ring-1 focus:ring-fuchsia-700"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label
            className="block text-sm font-medium text-gray-300"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className="w-full rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-sm text-white placeholder-gray-400 focus:border-fuchsia-700 focus:ring-1 focus:ring-fuchsia-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-pink-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-800 focus:outline-none"
        >
          Log In
        </button>
        <Link
          href={'/forgot-password'}
          className="block text-center text-sm text-gray-400 hover:underline"
        >
          Forgot password?
        </Link>
      </form>
    </main>
  );
}
