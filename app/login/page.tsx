'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from '../lib/axios';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard'); // or /admin if you check role later
    });
  }, []);
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
    <main className="flex min-h-screen items-center justify-center bg-fuchsia-100">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow-lg"
      >
        <h2 className="text-center text-2xl font-bold text-fuchsia-600">
          Login
        </h2>
        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          className="w-full rounded bg-gray-200 px-3 py-2 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full rounded bg-gray-200 px-3 py-2 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full rounded bg-fuchsia-700 py-2 text-white hover:bg-fuchsia-500"
        >
          Log In
        </button>
      </form>
    </main>
  );
}
