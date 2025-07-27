'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/BrowserClient';
import { DateTime } from 'luxon';

interface QuotaLog {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
}

const REASONS = ['all', 'purchase', 'send_sms', 'retries_exhausted'];

export default function QuotaReport() {
  const [logs, setLogs] = useState<QuotaLog[]>([]);
  const [reasonFilter, setReasonFilter] = useState('all');

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase.rpc('recent_quota_logs');
      if (error) {
        console.error('Error fetching quota logs:', error);
      } else {
        setLogs(data);
      }
    };

    fetchLogs();
  }, []);

  const groupedLogs = logs.reduce(
    (acc, log) => {
      const key = log.reason;
      acc[key] = acc[key] || [];
      acc[key].push(log);
      return acc;
    },
    {} as Record<string, QuotaLog[]>,
  );

  const visibleGroups = Object.entries(groupedLogs).filter(
    ([reason]) => reasonFilter === 'all' || reasonFilter === reason,
  );

  return (
    <div className="min-h-screen space-y-8 bg-gray-950 p-6 text-gray-200">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {REASONS.map((reason) => (
          <button
            key={reason}
            onClick={() => setReasonFilter(reason)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              reasonFilter === reason
                ? 'border-green-500 bg-green-900/10 text-green-400'
                : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {reason}
          </button>
        ))}
      </div>

      {/* Quota Logs Display */}
      {visibleGroups.length === 0 ? (
        <p className="text-sm text-gray-400">
          No quota activity in the last 30 days.
        </p>
      ) : (
        visibleGroups.map(([reason, entries]) => (
          <section key={reason}>
            <h2 className="mb-4 text-xl font-bold text-gray-100 capitalize">
              {reason} ({entries.length})
            </h2>
            <ul className="space-y-4">
              {entries.map((log) => (
                <li
                  key={log.id}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-sm hover:shadow-md"
                >
                  <div className="flex flex-col gap-2 text-sm text-gray-200 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
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
                    </div>
                    <p className="text-xs whitespace-nowrap text-gray-500">
                      {DateTime.fromISO(log.created_at, { zone: 'utc' })
                        .setZone('Africa/Nairobi')
                        .toFormat("EEE, MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
