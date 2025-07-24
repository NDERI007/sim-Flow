'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Mail, Phone } from 'lucide-react';

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ container: containerRef });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 400]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -300]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main
      ref={containerRef}
      className="relative min-h-screen bg-[#1e1b2e] text-white"
    >
      {/* Navigation */}
      <div className="sticky top-0 z-50 flex h-16 items-center justify-end gap-4 bg-transparent px-6 backdrop-blur-sm">
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

      {/* Parallax Background */}
      {mounted && (
        <motion.div className="pointer-events-none absolute inset-0 z-0">
          <motion.div style={{ y: y1 }} className="absolute top-10 left-10">
            <svg
              viewBox="0 0 100 100"
              className="h-40 w-40 fill-purple-600 opacity-10"
            >
              <polygon points="50,0 100,100 0,100" />
            </svg>
          </motion.div>
          <motion.div style={{ y: y2 }} className="absolute right-20 bottom-40">
            <svg
              viewBox="0 0 100 100"
              className="h-32 w-32 fill-pink-400 opacity-10"
            >
              <rect width="100" height="100" />
            </svg>
          </motion.div>
        </motion.div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#2a273f] bg-[#1a1929] px-6 py-12 text-center">
        <h2 className="mb-4 text-4xl font-semibold text-purple-200">
          Get in Touch
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-lg text-slate-400">
          Have questions, feedback, or need support? Reach out anytime.
        </p>
        <div className="flex flex-col justify-center gap-4 text-white md:flex-row">
          <a
            href="mailto:support@yourdomain.com"
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 transition hover:bg-indigo-500"
          >
            <Mail />
            will do
          </a>
          <p className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 transition hover:bg-indigo-500">
            <Phone size={18} />
            +254 790504636
          </p>
          <p className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 transition hover:bg-indigo-500">
            <Phone size={18} />
            +254 727 942764
          </p>
        </div>
      </footer>
    </main>
  );
}
