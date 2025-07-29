'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase/BrowserClient';
import { motion, AnimatePresence } from 'framer-motion';

export function PromptBanner() {
  const [show, setShow] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMfa = async () => {
      if (sessionStorage.getItem('mfa_prompt_dismissed')) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('mfa_enabled')
        .eq('id', user.id)
        .single();

      if (!error && data && !data.mfa_enabled) {
        setShow(true);

        // Auto-dismiss after 10 seconds
        const timeout = setTimeout(() => {
          dismiss();
        }, 10000);
        setTimer(timeout);
      }
    };

    checkMfa();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem('mfa_prompt_dismissed', 'true');
    setShow(false);
    if (timer) clearTimeout(timer);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="fixed top-4 right-4 left-4 z-50 mx-auto max-w-md rounded-xl border border-zinc-700 bg-gray-900 p-4 text-white shadow-xl"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base font-semibold">Protect your account</h4>
              <p className="text-sm text-zinc-300">
                Enable two-factor authentication to boost your account security.
              </p>
            </div>
            <div className="mt-2 flex gap-2 sm:mt-0">
              <button
                onClick={() => {
                  if (timer) clearTimeout(timer);
                  window.location.href = '/mfa';
                }}
                className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Enable MFA
              </button>
              <button
                onClick={dismiss}
                className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
