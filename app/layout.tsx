'use client';
import './globals.css';

import { Inter } from 'next/font/google';
import { useAuthStore } from './lib/AuthStore';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fetchUser = useAuthStore((state) => state.getUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900`}>
        {children}
      </body>
    </html>
  );
}
