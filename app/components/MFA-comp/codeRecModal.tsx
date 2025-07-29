'use client';

import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { supabase } from '../../lib/supabase/BrowserClient';

function hashSHA256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  return crypto.subtle.digest('SHA-256', data).then((hashBuffer) => {
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  });
}

export function RecoveryCodesModal({ onClose }: { onClose: () => void }) {
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateCodes = async () => {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        console.error('No user found:', userErr);
        onClose();
        return;
      }

      // Check if codes already generated
      const { data: userRow } = await supabase
        .from('users')
        .select('recovery_codes_generated')
        .eq('id', user.id)
        .single();

      if (userRow?.recovery_codes_generated) {
        console.warn('Recovery codes already generated');
        onClose();
        return;
      }

      const newCodes = Array.from({ length: 10 }, () =>
        nanoid(10).toUpperCase(),
      );
      const hashedCodes = await Promise.all(newCodes.map(hashSHA256));

      const { error: upsertError } = await supabase
        .from('user_recovery_codes')
        .upsert(
          {
            user_id: user.id,
            codes: hashedCodes,
            used_codes: [],
          },
          { onConflict: 'user_id' },
        );

      if (upsertError) {
        console.error('Failed to store hashed codes:', upsertError.message);
        onClose();
        return;
      }

      await supabase
        .from('users')
        .update({
          recovery_codes_generated: true,
        })
        .eq('id', user.id);

      setCodes(newCodes);
      setLoading(false);
    };

    generateCodes();
  }, []);

  const downloadCodes = () => {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    onClose();
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-lg bg-slate-900 p-6 text-white shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Recovery Codes
        </h2>

        <p className="text-sm text-gray-300">
          Save these one-time codes in a secure location. If you lose access to
          your authenticator app, you can use these to log in.
        </p>

        <div className="my-4 space-y-2 rounded-md bg-zinc-800 p-4 font-mono text-sm text-indigo-300">
          {codes.map((code, i) => (
            <div key={i}>{code}</div>
          ))}
        </div>

        <button
          onClick={downloadCodes}
          className="mb-4 text-sm text-indigo-400 underline hover:text-indigo-300"
        >
          Download as .txt
        </button>

        <button
          onClick={handleClose}
          className="w-full rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
        >
          I’ve saved the codes
        </button>
      </div>
    </div>
  );
}
