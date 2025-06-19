'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import LogOutButton from './LogOut';

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Messages', href: '/admin/messages' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Settings', href: '/admin/settings' },
  ];

  return (
    <aside className="flex w-64 flex-col justify-between bg-fuchsia-400 p-6 text-white">
      <div>
        <h2 className="mb-6 text-xl font-bold">Admin Panel</h2>
        <LogOutButton />
        <nav className="space-y-3">
          {navItems.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`block rounded-lg px-3 py-2 ${
                pathname === href
                  ? 'bg-fuchsia-600 font-semibold'
                  : 'hover:bg-white/10'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
