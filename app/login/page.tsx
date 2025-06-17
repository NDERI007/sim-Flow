'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import axios from '../lib/axios';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  // ✅ Redirect if already logged in
  useEffect(() => {
    axios.get('/api/auth/session').then((res) => {
      const role = res.data?.user?.role;
      if (role) {
        router.push(role === 'admin' ? '/admin' : '/dashboard');
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res?.ok) {
      try {
        const sessionRes = await axios.get('/api/auth/session');
        const role = sessionRes.data?.user?.role;

        if (role) {
          router.push(role === 'admin' ? '/admin' : '/dashboard');
        } else {
          setError('Could not get user role');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Session check failed');
      }
    } else {
      setError('Invalid credentials');
    }
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
