'use client';

import Link from 'next/link';

export default function CompanyHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900 p-4 shadow-sm">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard"
          className="text-lg font-bold text-white transition hover:text-blue-300"
        >
          Boushu
        </Link>
      </div>
    </header>
  );
}
