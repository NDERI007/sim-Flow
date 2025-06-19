'use client';

import { createBrowserClient } from '@supabase/ssr';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LogOutButton() {
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <button
      onClick={handleLogOut}
      className="flex items-center rounded-xl bg-fuchsia-600 px-4 py-2 text-white shadow-md transition hover:bg-fuchsia-700"
    >
      <LogOut size={20} />
      Logout
    </button>
  );
}
