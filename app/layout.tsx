'use client';
import './globals.css';
import { Inter } from 'next/font/google';
import { useAuthStore } from './lib/AuthStore';
import { useEffect } from 'react';
import CompanyHeader from './components/companyHeader';
import { usePathname } from 'next/navigation';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fetchUser = useAuthStore((state) => state.getUser);
  const pathname = usePathname();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const HideHeaderOn = [
    '/login',
    'register',
    'completion',
    'verify',
    '/',
    '/admin',
    '/forgot-password',
    '/reset-password',
  ];
  const showHeader = !HideHeaderOn.includes(pathname);
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900`}>
        {showHeader && <CompanyHeader />}
        {children}
      </body>
    </html>
  );
}
