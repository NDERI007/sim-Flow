import './globals.css';
import { Inter } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Toaster } from 'sonner';
import { AuthWrapper } from './lib/WithAuth/AuthListner';
import ShowHeaderClient from './components/ShowHeader';

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
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900`}>
        <ShowHeaderClient />
        <AuthWrapper />
        {children}
        <Toaster richColors />
        <SpeedInsights />
      </body>
    </html>
  );
}
