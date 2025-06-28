'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 🔁 Auto-redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = data?.role; //If data is not null or undefined, then return data.role

        //If data is null or undefined, don’t throw an error, just return undefined

        router.push(role === 'admin' ? '/admin' : '/unAuth');
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    // Optional: fetch user role from your `users` table if needed
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    const role = userRow?.role || 'user';
    router.push(role === 'admin' ? '/admin' : '/dashboard');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-6 rounded-xl bg-gray-800 p-8 shadow-lg"
      >
        <h2 className="text-center text-2xl font-bold text-pink-900">Login</h2>

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
          className="w-full rounded-md bg-pink-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-600 focus:ring-2 focus:ring-fuchsia-700 focus:outline-none"
        >
          Log In
        </button>
      </form>
    </main>
  );
}
