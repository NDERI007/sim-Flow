'use client';
import './globals.css';
import { Inter } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import CompanyHeader from './components/companyHeader';
import { usePathname } from 'next/navigation';
import { AuthWrapper } from './lib/AuthListner';

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
        <AuthWrapper />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
