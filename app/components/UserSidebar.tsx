'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogOutButton from './LogOut';

export default function UserSidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/messages', label: 'My Messages' },
    { href: '/dashboard/settings', label: 'Settings' },
  ];

  return (
    <aside className="w-64 space-y-4 bg-fuchsia-100 p-6 text-fuchsia-900">
      <h2 className="text-xl font-bold">User Panel</h2>
      <LogOutButton />
      <nav className="flex flex-col gap-2">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded px-3 py-2 transition ${
              pathname === href
                ? 'bg-fuchsia-700 text-white'
                : 'hover:bg-fuchsia-200'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
