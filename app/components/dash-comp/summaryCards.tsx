// components/Dashboard/SummaryCards.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, MessageCircle, TimerReset } from 'lucide-react';
import axios from 'axios';

interface Metric {
  quota: number;
  sentToday: number;
  scheduledCount: number;
}

export default function SummaryCards() {
  const [data, setData] = useState<Metric | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await axios.get('/api/metrics');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load metrics', err);
      }
    };
    fetchMetrics();
  }, []);

  const cards = [
    {
      label: 'Quota Remaining',
      value: data?.quota ?? '...',
      icon: BarChart,
      color: 'text-green-600',
    },
    {
      label: 'Sent Today',
      value: data?.sentToday ?? '...',
      icon: MessageCircle,
      color: 'text-blue-600',
    },
    {
      label: 'Scheduled Sends',
      value: data?.scheduledCount ?? '...',
      icon: TimerReset,
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-xl border bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-500">{label}</div>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-800">{value}</div>
        </motion.div>
      ))}
    </div>
  );
}
