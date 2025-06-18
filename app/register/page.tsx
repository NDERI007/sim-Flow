'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from '../lib/axios';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await axios.post('/api/register', { email, password });

      // Auto-login after registration
      const loginRes = await axios.post('/api/login', { email, password });

      const { token, user } = loginRes.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      router.push(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-fuchsia-100">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow-lg"
      >
        <h2 className="text-center text-2xl font-bold text-fuchsia-600">
          Register
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
          Register
        </button>
      </form>
    </main>
  );
}
