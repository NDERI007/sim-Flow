'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Mail, Phone } from 'lucide-react';

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ container: containerRef });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 400]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -300]);

  return (
    <main
      ref={containerRef}
      className="relative max-h-screen overflow-y-auto scroll-smooth bg-gradient-to-br from-[#1a1c2c] via-[#2e145f] to-[#0f0c29] text-white"
    >
      {/* Navigation */}
      <div className="sticky top-0 z-50 flex justify-end gap-4 bg-transparent p-6 backdrop-blur-sm">
        <Link
          href="/login"
          className="rounded-lg bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-500"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-500"
        >
          Get Started
        </Link>
      </div>
      {/* Parallax Background */}
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
      {/* Hero */}
      <section className="relative z-10 flex h-screen flex-col items-center justify-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{
            type: 'tween',
            duration: 1.2,
            ease: 'easeOut', // or use [0.25, 0.1, 0.25, 1] for linear-ish smooth
          }}
          className="mb-4 max-w-3xl text-5xl font-bold text-purple-300 md:text-6xl"
        >
          You Good, Twin?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{
            type: 'tween',
            duration: 1,
            delay: 0.3,
            ease: 'easeOut',
          }}
          className="max-w-xl text-xl text-slate-400 md:text-2xl"
        >
          Send bulk sms. Organize contacts. All in one dashboard.
        </motion.p>
      </section>

      <footer className="bg-gradient-to-t from-[#0f0c29] to-transparent px-6 py-12 text-center">
        <h2 className="mb-4 text-4xl font-semibold text-purple-200">
          Get in Touch
        </h2>

        <p className="mx-auto mb-8 max-w-xl text-lg text-slate-400">
          Have questions, feedback, or need support? Reach out anytime.
        </p>

        <div className="flex flex-col justify-center gap-4 text-white md:flex-row">
          <a
            href="mailto:support@yourdomain.com"
            className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 transition hover:bg-purple-500"
          >
            <Mail />
            will do
          </a>
          <p className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 transition hover:bg-purple-500">
            <Phone size={18} />
            +254 790504636
          </p>
          <p className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 transition hover:bg-purple-500">
            <Phone size={18} />
            +254 727 942764
          </p>
        </div>
      </footer>
    </main>
  );
}
