'use client';
import { useState } from 'react';

import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Password updated. Redirecting...');
      setTimeout(() => router.push('/login'), 2000);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
      <form
        onSubmit={handleReset}
        className="w-full max-w-md space-y-5 rounded-xl bg-gray-900 p-6 shadow-lg"
      >
        <h1 className="text-2xl font-semibold text-gray-500">Reset Password</h1>

        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            placeholder="New password"
            className="w-full rounded-md bg-gray-800 px-4 py-2 pr-10 text-white placeholder-gray-400 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute top-2.5 right-3 text-sm text-pink-300 hover:text-pink-400"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-pink-900 px-4 py-2 font-medium text-white hover:bg-pink-800 disabled:bg-pink-700"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
