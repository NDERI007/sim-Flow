'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Check your email for the reset link.');
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
      <form
        onSubmit={handleSendReset}
        className="w-full max-w-md space-y-5 rounded-xl bg-gray-900 p-6 shadow-lg"
      >
        <h1 className="text-2xl font-semibold text-pink-400">
          Forgot Password
        </h1>

        <input
          type="email"
          autoFocus
          placeholder="Email"
          className="w-full rounded-md border border-pink-900 bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-900 focus:outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-pink-900 px-4 py-2 font-medium text-white hover:bg-pink-800 disabled:bg-pink-700"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
}
