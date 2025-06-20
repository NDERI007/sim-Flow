'use client';

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function InvitePage() {
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInviteLink('');
    setLoading(true);

    // Check if invite already exists
    const { data: existingInvite } = await supabase
      .from('invites')
      .select('id')
      .eq('email', email)
      .eq('used', false)
      .single();

    if (existingInvite) {
      setInviteLink(
        `${window.location.origin}/register?email=${encodeURIComponent(email)}`,
      );
      setLoading(false);
      return;
    }

    // Create new invite
    const { error: insertError } = await supabase.from('invites').insert({
      email,
      role: 'admin',
    });

    if (insertError) {
      setError('Failed to create invite.');
      setLoading(false);
      return;
    }

    const link = `${window.location.origin}/register?email=${encodeURIComponent(email)}`;
    setInviteLink(link);
    setEmail('');
    setLoading(false);
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

        {error && <p className="text-center text-red-600">{error}</p>}
        {inviteLink && (
          <p className="text-sm break-words text-green-700">
            Share this link: <br />
            <a
              href={inviteLink}
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {inviteLink}
            </a>
          </p>
        )}

        <input
          type="email"
          placeholder="Admin Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded bg-gray-100 px-3 py-2 outline-none"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-fuchsia-700 py-2 text-white hover:bg-fuchsia-500"
        >
          {loading ? 'Inviting...' : 'Generate Invite Link'}
        </button>
      </form>
    </main>
  );
}
