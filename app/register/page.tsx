'use client';

import { useState } from 'react';
import axios from '../lib/axios';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react'; // ✅ NEW

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // 1. Register user on the backend
      await axios.post('/api/register', { email, password, name });

      // 2. Auto-login using credentials provider
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false, // don't redirect immediately
      });

      if (res?.ok) {
        router.push('/dashboard'); // or '/admin' if needed
      } else {
        setError('Login after signup failed.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow-lg"
      >
        <h2 className="text-center text-2xl font-semibold text-black">
          Create an account
        </h2>

        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        <input
          type="text"
          placeholder="Full Name"
          className="w-full rounded bg-gray-200 px-3 py-2 outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
          className="w-full rounded bg-fuchsia-600 py-2 text-white hover:bg-fuchsia-400"
        >
          Create Account
        </button>
      </form>
    </main>
  );
}
