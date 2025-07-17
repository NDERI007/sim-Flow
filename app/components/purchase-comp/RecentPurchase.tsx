'use client';

import { CreditCard } from 'lucide-react';
import { DateTime } from 'luxon';
import { useRecentPurchases } from '../../lib/Recents/purchases';
import RefundModal from './RefundModal';
import { useState } from 'react';

export default function RecentPurchase() {
  const { purchases, loading, error } = useRecentPurchases();
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(
    null,
  );

  const openRefundModal = (ref: string) => setSelectedTransaction(ref);
  const closeRefundModal = () => setSelectedTransaction(null);

  if (loading)
    return <p className="text-sm text-gray-400">Loading purchases...</p>;
  if (error) {
    console.error('Failed to fetch recent purchases:', error);
    return <p className="text-sm text-red-400">Failed to load purchases</p>;
  }
  return (
    <div className="w-full max-w-3xl space-y-4 rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-950 to-gray-900 p-4 text-gray-100 shadow-lg">
      {/* Heading */}
      <h3 className="text-lg font-semibold text-green-300">Recent Purchases</h3>

      {/* No Purchases Fallback */}
      {purchases.length === 0 ? (
        <p className="text-sm text-gray-400">No purchases in the last month.</p>
      ) : (
        <ul className="space-y-3">
          {purchases.map((log) => (
            <li
              key={log.id}
              className="grid gap-3 overflow-hidden rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm transition hover:shadow-md sm:grid-cols-[1fr_auto] sm:items-center"
            >
              {/* Left Section: Amount, Ref, Date, Status */}
              <div className="min-w-0 space-y-1">
                {/* Amount */}
                <span className="block font-semibold whitespace-nowrap text-green-400">
                  KES {log.amount.toLocaleString()}
                </span>

                {/* Transaction Ref */}
                {log.transaction_ref && (
                  <span className="flex items-center gap-1 truncate text-xs text-indigo-300">
                    <CreditCard size={12} />
                    {log.transaction_ref}
                  </span>
                )}

                {/* Date */}
                <span className="block truncate text-xs text-gray-400">
                  {log.created_at
                    ? DateTime.fromISO(log.created_at, { zone: 'utc' })
                        .setZone('Africa/Nairobi')
                        .toFormat("EEE, MMM dd, yyyy 'at' h:mm a")
                    : 'Unknown time'}
                </span>

                {/* Status Badge */}
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs ${
                    log.status === 'refunded'
                      ? 'bg-violet-900/20 text-violet-400'
                      : log.status === 'success'
                        ? 'bg-green-900/20 text-green-400'
                        : log.status === 'failed'
                          ? 'bg-red-900/10 text-red-400'
                          : 'bg-gray-800 text-gray-400 italic'
                  }`}
                >
                  {log.status}
                </span>
              </div>

              {/* Right Section: Refund Button */}
              <div className="text-right">
                {log.transaction_ref && (
                  <button
                    onClick={() => openRefundModal(log.transaction_ref)}
                    disabled={log.status !== 'success'}
                    className={`text-xs whitespace-nowrap hover:underline ${
                      log.status === 'success'
                        ? 'text-red-400'
                        : 'cursor-not-allowed text-gray-500'
                    }`}
                  >
                    Request Refund
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Refund Modal */}
      {selectedTransaction && (
        <RefundModal
          transactionRef={selectedTransaction}
          onClose={closeRefundModal}
        />
      )}
    </div>
  );
}
