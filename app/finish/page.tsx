'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function FinishRegistrationPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [senderId, setSenderId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/api/complete-registration', {
        email,
        sender_id: senderId,
        password,
      });

      if (res.status === 200) {
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
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded bg-zinc-700 px-3 py-2 text-white"
        />

        <input
          type="text"
          placeholder="OTP code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
          className="w-full rounded bg-zinc-700 px-3 py-2 text-white"
        />

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
