'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase/BrowserClient';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

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
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 left-1/2 z-50 w-[95%] max-w-xl -translate-x-1/2 rounded-2xl border border-zinc-700 bg-gray-900 p-4 shadow-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="mt-1">
              <ShieldAlert className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-semibold text-white">
                Protect your account
              </h4>
              <p className="mt-1 text-sm text-zinc-300">
                Enable two-factor authentication to secure your login and
                prevent unauthorized access.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    if (timer) clearTimeout(timer);
                    window.location.href = '/mfa';
                  }}
                  className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
                >
                  Enable MFA
                </button>
                <button
                  onClick={dismiss}
                  className="rounded-full border border-zinc-600 bg-transparent px-4 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
