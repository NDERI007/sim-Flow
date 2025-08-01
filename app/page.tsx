'use client';

import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#1e1b2e] text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-transparent backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Brand name */}
          <Link
            href="/"
            className="text-xl font-bold tracking-wide text-white transition hover:text-indigo-300"
          >
            boushu
          </Link>

          {/* Action buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="rounded-xl bg-indigo-500/80 px-5 py-2.5 text-sm font-medium text-white shadow-md backdrop-blur-md transition hover:bg-indigo-400/90"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-indigo-500/80 px-5 py-2.5 text-sm font-medium text-white shadow-md backdrop-blur-md transition hover:bg-indigo-400/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 text-center">
        <h1 className="max-w-3xl text-[clamp(2.5rem,6vw,4rem)] leading-snug font-semibold text-white">
          <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Send
          </span>{' '}
          bulk SMS.{' '}
          <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Organize
          </span>{' '}
          contacts. All in one dashboard.
        </h1>
      </section>

      <footer className="bg-[#1a1929] px-6 py-12 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-xl font-bold text-white sm:text-5xl">
            Get in touch
          </h2>

          <p className="mb-8 text-base text-slate-400 sm:text-lg">
            Have any questions, feedback, or need help? Reach out to us and
            we’ll get back to you as soon as we can.
          </p>

          <div className="mt-12 border-t border-[#2a273f] pt-8 text-center text-sm text-slate-500">
            <div className="mb-4">
              <span className="block md:inline">Tel +254 790 504636</span>
              <span className="mx-2 hidden md:inline">|</span>
              <span className="block md:inline">Tel: +254 727 942764</span>
            </div>
            <div className="mb-2">
              <a
                href="mailto:support@yourdomain.com"
                className="hover:underline"
              >
                support@yourdomain.com
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
