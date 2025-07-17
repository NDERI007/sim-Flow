'use client';

import { useState } from 'react';
import axios from 'axios';

export default function RefundModal({
  transactionRef,
  onClose,
}: {
  transactionRef: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefund = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post('/api/refund', {
        transaction_ref: transactionRef,
      });

      if (res.status === 200) {
        onClose(); // close the modal on success
      } else {
        setError(res.data?.message || 'Refund failed');
      }
    } catch (err) {
      let message = 'An unexpected error occurred';

      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl bg-gray-900 p-6 text-white shadow-lg">
        <h2 className="mb-2 text-lg font-semibold text-red-300">
          Request Refund
        </h2>
        <p className="text-sm">Refund for transaction:</p>
        <code className="mb-4 block truncate text-xs text-indigo-300">
          {transactionRef}
        </code>

        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:underline"
          >
            Cancel
          </button>
          <button
            onClick={handleRefund}
            disabled={loading}
            className="text-xs text-red-400 hover:underline"
          >
            {loading ? 'Processing...' : 'Confirm Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}
