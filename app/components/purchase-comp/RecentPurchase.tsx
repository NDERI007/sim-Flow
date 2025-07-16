'use client';

import { CreditCard } from 'lucide-react';
import { DateTime } from 'luxon';
import { useRecentPurchases } from '../../lib/Recents/purchases';

export default function RecentPurchase() {
  const { purchases, loading, error } = useRecentPurchases();

  if (loading)
    return <p className="text-sm text-gray-400">Loading purchases...</p>;
  if (error) {
    console.error('Failed to fetch recent purchases:', error);
    return <p className="text-sm text-red-400">Failed to load purchases</p>;
  }
  return (
    <div className="w-full max-w-3xl space-y-4 rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-950 to-gray-900 p-4 text-gray-100 shadow-lg">
      <h3 className="text-lg font-semibold text-green-300">Recent Purchases</h3>

      {purchases.length === 0 ? (
        <p className="text-sm text-gray-400">No purchases in the last month.</p>
      ) : (
        <ul className="space-y-3">
          {purchases.map((log) => (
            <li
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-gray-800 bg-gray-900 p-3 text-sm transition hover:shadow-md lg:flex-nowrap"
            >
              <span className="font-medium whitespace-nowrap text-green-400">
                KES {log.amount.toLocaleString()}
              </span>

              {log.transaction_ref && (
                <span className="inline-flex max-w-[120px] items-center gap-1 truncate overflow-hidden whitespace-nowrap text-indigo-300">
                  <CreditCard size={12} />
                  {log.transaction_ref}
                </span>
              )}

              <span className="whitespace-nowrap text-gray-400">
                {log.created_at
                  ? DateTime.fromISO(log.created_at)
                      .setZone('Africa/Nairobi')
                      .toFormat('yyyy-MM-dd HH:mm')
                  : 'Unknown time'}
              </span>

              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  log.status === 'refund'
                    ? 'text-red-400'
                    : log.status === 'success'
                      ? 'text-green-400'
                      : 'text-yellow-400'
                }`}
              >
                {log.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
