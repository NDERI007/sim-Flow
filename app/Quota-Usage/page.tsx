'use client';

import { useEffect, useState } from 'react';

import { DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QuotaLog {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
  transaction_ref?: string | null;
}

export default function QuotaReport() {
  const [logs, setLogs] = useState<QuotaLog[]>([]);
  const [reasonFilter, setReasonFilter] = useState('all');

  const Reasons = ['all', 'purchase', 'send_sms', 'retries_exhausted'];

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase.rpc('get_quota_logs');

      if (error) {
        console.error('Error fetching quota logs:', error);
      } else {
        setLogs(data);
      }
    };

    fetchLogs();
  }, []);

  const grouped = logs.reduce(
    (acc, log) => {
      const key = log.reason;
      acc[key] = acc[key] || [];
      acc[key].push(log);
      return acc;
    },
    {} as Record<string, QuotaLog[]>,
  );

  return (
    <div className="min-h-screen space-y-8 bg-gray-950 p-6 text-gray-200">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {Reasons.map((r) => (
          <button
            key={r}
            onClick={() => setReasonFilter(r)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              reasonFilter === r
                ? 'border-green-500 bg-green-900/10 text-green-400'
                : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Logs grouped by reason */}
      {Object.entries(grouped)
        .filter(([reason]) => reasonFilter === 'all' || reasonFilter === reason)
        .map(([reason, entries]) => (
          <div key={reason}>
            <h2 className="mb-4 text-xl font-bold text-gray-100 capitalize">
              {reason} ({entries.length})
            </h2>

            <ul className="space-y-4">
              {entries.map((log) => (
                <li
                  key={log.id}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="text-sm text-gray-200">
                      <p>
                        Amount:{' '}
                        <span className="font-semibold text-green-400">
                          KES {log.amount.toLocaleString()}
                        </span>
                      </p>
                      <p>
                        Reason:{' '}
                        <span className="text-pink-300 capitalize">
                          {log.reason}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>

                    {/* Show transaction ref if available */}
                    {log.reason === 'purchase' && log.transaction_ref && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-900 px-3 py-1 text-xs font-medium text-indigo-300 shadow-sm">
                        <DollarSign size={12} />
                        {log.transaction_ref}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
