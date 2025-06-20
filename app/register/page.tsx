'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const invitedEmail = searchParams.get('email') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔁 Auto-redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = data?.role;
        router.push(role === 'admin' ? '/admin' : '/dashboard');
      }
    });
  }, [router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!invitedEmail) {
      setError('Missing invite email.');
      setLoading(false);
      return;
    }

    // 1. Validate invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('email', invitedEmail)
      .eq('used', false)
      .single();

    if (inviteError || !invite) {
      setError('Invalid or already used invite.');
      setLoading(false);
      return;
    }

    // 2. Sign up the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: invitedEmail,
      password,
    });

    if (signUpError || !authData.user) {
      setError(signUpError?.message || 'Signup failed.');
      setLoading(false);
      return;
    }

    // 3. Insert into users table
    const { error: insertError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: invitedEmail,
      role: invite.role,
      quota: 1000,
    });

    if (insertError) {
      setError('Signup succeeded but profile insert failed.');
      setLoading(false);
      return;
    }

    // 4. Mark invite as used
    await supabase.from('invites').update({ used: true }).eq('id', invite.id);

    // 5. Redirect
    router.push(invite.role === 'admin' ? '/admin' : '/unAuth');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-fuchsia-100">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow-lg"
      >
        <h2 className="text-center text-2xl font-bold text-fuchsia-600">
          Register with Invite
        </h2>

        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        <input
          type="email"
          value={invitedEmail}
          readOnly
          className="w-full rounded bg-gray-200 px-3 py-2 outline-none"
        />
        <input
          type="password"
          placeholder="Choose a password"
          className="w-full rounded bg-gray-200 px-3 py-2 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-fuchsia-700 py-2 text-white hover:bg-fuchsia-500"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </main>
  );
}
