'use client';

import { useRouter } from 'next/navigation';
import { mutate } from 'swr';
import { supabase } from '../../lib/supabase/BrowserClient';

export default function LogOutAdmin() {
  const router = useRouter();
  const handleLogOut = async () => {
    await supabase.auth.signOut();
    mutate('/api/users', undefined, { revalidate: false });
    router.push('/');
  };

  return (
    <button
      onClick={handleLogOut}
      className="flex items-center rounded-md px-4 py-2 text-white shadow-md transition hover:bg-white/10"
      style={{
        backgroundColor: 'var(--color-primary)',
        color: 'white',
      }}
    >
      Logout
    </button>
  );
}
