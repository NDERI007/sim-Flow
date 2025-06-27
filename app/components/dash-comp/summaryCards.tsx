// components/Dashboard/SummaryCards.tsx
'use client';

import { BarChart, MessageCircle, TimerReset } from 'lucide-react';

import { useQuota } from '@/app/lib/RealTime_Q';
import { useMetrics } from '@/app/lib/metrics';

export default function SummaryCards() {
  const { quota, isLoading: quotaLoading } = useQuota();

  const { sentToday, scheduledCount, scheduled, isLoading } = useMetrics();

  const cards = [
    {
      label: 'Quota Remaining',
      value: quotaLoading ? '...' : (quota ?? 'N/A'),
      icon: BarChart,
      color:
        quota == null || quotaLoading
          ? 'text-gray-500'
          : quota <= 0
            ? 'text-red-600'
            : quota <= 10
              ? 'text-yellow-600'
              : 'text-green-600',
      bgColor:
        quota == null || quotaLoading
          ? 'bg-gray-100'
          : quota <= 0
            ? 'bg-red-100'
            : quota <= 10
              ? 'bg-yellow-100'
              : 'bg-green-100',
      showUpgrade: quota != null && quota <= 10,
    },
    {
      label: 'Sent Today',
      value: sentToday ?? '...',
      icon: MessageCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Scheduled Sends',
      value: scheduledCount ?? '...',
      icon: TimerReset,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map(
        ({ label, value, icon: Icon, color, bgColor, showUpgrade }) => (
          <div key={label} className={`rounded-xl p-4 shadow-sm ${bgColor}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-500">{label}</div>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-800">{value}</div>

            {showUpgrade && (
              <button
                className="mt-3 inline-block rounded-md bg-yellow-500 px-3 py-1 text-sm font-semibold text-white hover:bg-yellow-600"
                onClick={() => {
                  // Optional: redirect to upgrade page
                  window.location.href = '/pricing'; // customize as needed
                }}
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
