'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InfoPopover({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isVisible = open || hovered;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full bg-gray-500 px-2 text-xs font-bold text-white"
        aria-label="More info"
      >
        ?
      </button>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            className="absolute top-1 left-6 z-20 w-64 rounded bg-slate-800 p-3 text-sm text-gray-200 shadow-xl"
          >
            <p>{text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
