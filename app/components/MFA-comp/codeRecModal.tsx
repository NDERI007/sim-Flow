'use client';

import { useEffect, useState } from 'react';
import { generateRecoveryCodes } from '../../lib/mfa/generateCodes';

export function RecoveryCodesModal({ onClose }: { onClose: () => void }) {
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generate = async () => {
      const results = await generateRecoveryCodes();
      if (results.error) {
        console.error(results.error);
        onClose();
        return;
      }

      setCodes(results.codes!);
      setLoading(false);
    };

    generate();
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
