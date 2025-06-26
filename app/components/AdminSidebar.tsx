'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogOutButton from './LogOut';

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/logistics', label: 'Logistics' },
    { href: '/contacts', label: 'Contact groups' },
  ];

  return (
    <aside className="flex w-64 flex-col justify-between bg-slate-950 p-6 text-gray-300">
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
                  ? 'bg-slate-800 font-semibold'
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
