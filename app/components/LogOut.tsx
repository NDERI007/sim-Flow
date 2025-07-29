'use client';

import { supabase } from '../lib/supabase/BrowserClient';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';

export default function LogOutButton() {
  const router = useRouter();
  const handleLogOut = async () => {
    await supabase.auth.signOut();
    mutate(() => true, undefined, { revalidate: false });
    router.push('/');
  };

  return (
    <button
      onClick={handleLogOut}
      className="flex items-center rounded-md px-4 py-2 text-white shadow-md transition hover:bg-white/10"
    >
      <LogOut size={20} />
      Logout
    </button>
  );
}
