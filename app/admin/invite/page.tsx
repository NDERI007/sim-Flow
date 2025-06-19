'use client';

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function InvitePage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // 🧠 Check if email already invited
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      setError('This email is already invited.');
      return;
    }

    const { error: insertError } = await supabase.from('users').insert({
      email,
      role: 'admin',
      quota: 1000,
      invited: true,
      registered: false,
    });

    if (insertError) {
      setError('Failed to invite user.');
    } else {
      setMessage('User invited successfully!');
      setEmail('');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-fuchsia-50">
      <form
        onSubmit={handleInvite}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow-md"
      >
        <h2 className="text-center text-2xl font-bold text-fuchsia-700">
          Invite Admin
        </h2>

        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        {message && (
          <p className="text-center text-sm text-green-600">{message}</p>
        )}

        <input
          type="email"
          placeholder="Admin Email"
          className="w-full rounded bg-gray-100 px-3 py-2 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full rounded bg-fuchsia-700 py-2 text-white hover:bg-fuchsia-500"
        >
          Invite
        </button>
      </form>
    </main>
  );
}
