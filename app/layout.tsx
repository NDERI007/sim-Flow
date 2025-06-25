import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { useAuthStore } from './lib/AuthStore';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FuchsiaSMS',
  description: 'Bulk SMS management made simple',
};

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
