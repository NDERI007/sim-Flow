'use client';

import { AlertTriangle, BarChart, MessageCircle } from 'lucide-react';
import { useQuota } from '../../lib/Quota_swr';
import { useMetrics } from '../../lib/metrics';
import { useAuthStore } from '../../lib/WithAuth/AuthStore';

export default function SummaryCards() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const { quota, isLoading: quotaLoading } = useQuota();
  const { sentToday, failedCount } = useMetrics();

  const cards = [
    {
      label: 'Quota Remaining',
      value: quotaLoading ? '...' : quota,
      icon: BarChart,
      color:
        quota == null || quotaLoading
          ? 'text-gray-400'
          : quota <= 0
            ? 'text-red-300'
            : quota <= 10
              ? 'text-yellow-300'
              : 'text-green-300',
      bgColor:
        quota == null || quotaLoading
          ? 'bg-gray-800'
          : quota <= 0
            ? 'bg-red-900/40'
            : quota <= 10
              ? 'bg-yellow-900/40'
              : 'bg-green-900/40',
      showUpgrade: quota != null && quota <= 10,
    },
    {
      label: 'Sent Today',
      value: sentToday ?? '...',
      icon: MessageCircle,
      color: 'text-blue-300',
      bgColor: 'bg-blue-900/40',
    },
    {
      label: 'Failed Messages',
      value: failedCount ?? '...',
      icon: AlertTriangle,
      color: 'text-red-300',
      bgColor: 'bg-red-900/40',
    },
  ];

  return (
    <div
      key={userId} // Forces fresh render per user switch
      className="grid gap-6"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
    >
      {cards.map(
        ({ label, value, icon: Icon, color, bgColor, showUpgrade }) => (
          <div
            key={label}
            className={`rounded-xl p-4 shadow-sm ${bgColor} flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-400">{label}</div>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>

            <div className="mt-2 text-2xl font-bold text-gray-100">{value}</div>

            {showUpgrade && (
              <button
                className="mt-4 inline-block rounded-md bg-yellow-500 px-3 py-1 text-sm font-semibold text-white hover:bg-yellow-600 dark:hover:bg-yellow-400"
                onClick={() => (window.location.href = '/purchase')}
              >
                Upgrade
              </button>
            )}
          </div>
        ),
      )}
    </div>
  );
}
