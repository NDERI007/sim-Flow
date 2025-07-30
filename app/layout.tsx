'use client';
import './globals.css';
import { Inter } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import CompanyHeader from './components/companyHeader';
import { usePathname } from 'next/navigation';

import { Toaster } from 'sonner';
import { AuthWrapper } from './lib/WithAuth/AuthListner';

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
  const pathname = usePathname();

  const HeaderOn = [
    '/send',
    '/purchase',
    '/contacts',
    '/Reports',
    '/Quota-Usage',
    '/templates',
    '/scheduled',
    '/settings',
  ];
  const showHeader = HeaderOn.includes(pathname);
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900`}>
        {showHeader && <CompanyHeader />}
        <AuthWrapper />
        {children}
        <Toaster richColors />
        <SpeedInsights />
      </body>
    </html>
  );
}
