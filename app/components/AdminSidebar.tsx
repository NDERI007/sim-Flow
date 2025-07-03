'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import LogOutButton from './LogOut';

import { useAuthStore } from '../lib/AuthStore';

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const displayName = user?.user_metadata?.name || 'Twin';

  const navItems = [
    { href: '/Reports', label: 'Delivery Reports' },
    { href: '/contacts', label: 'Contact groups' },
    { href: '/templates', label: 'Templates' },
  ];

  // Lock body scroll on mobile sidebar open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close sidebar on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <>
      {/* Hamburger Button */}
      <button
        className="fixed top-4 left-4 z-50 block rounded-lg bg-pink-900 p-2 text-white md:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Sidebar Navigation"
        className={`fixed top-0 left-0 z-50 h-screen w-64 transform bg-slate-950 p-6 text-gray-300 shadow-lg transition-transform duration-300 md:block md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close Button */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <div className="text-semibold mb-4 rounded-lg p-3 text-gray-200 shadow">
            👋 Welcome back,{' '}
            <span className="font-semibold text-white">{displayName}</span>!
          </div>

          <button onClick={() => setIsOpen(false)} aria-label="Close sidebar">
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Only show heading on md+ */}
        <div className="mb-6 hidden text-xl font-bold text-gray-200 md:block">
          👋 Welcome back,{' '}
          <span className="font-semibold text-white">{displayName}</span>!
        </div>

        <LogOutButton />
        <nav className="mt-4 space-y-3">
          {navItems.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`block rounded-lg px-3 py-2 transition ${
                pathname === href
                  ? 'bg-pink-900 font-semibold text-white'
                  : 'hover:bg-white/10'
              }`}
              onClick={() => setIsOpen(false)} // Close on navigation
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
