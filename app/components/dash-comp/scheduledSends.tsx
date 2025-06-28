'use client';

import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
import axios from 'axios';
import { useMetrics } from '../../lib/metrics';

interface ScheduledMessage {
  id: string;
  to_number: string[];
  message: string;
  scheduled_at: string;
}
interface MetricsData {
  sentToday: number;
  scheduledCount: number;
  scheduled: ScheduledMessage[];
}

const groupByDate = (messages: ScheduledMessage[]) => {
  const now = DateTime.local().setZone('Africa/Nairobi');
  const grouped: Record<string, ScheduledMessage[]> = {};

  for (const msg of messages) {
    const date = DateTime.fromISO(msg.scheduled_at).setZone('Africa/Nairobi');
    let label = date.toFormat('DDD');

    if (date.hasSame(now, 'day')) label = 'Today';
    else if (date.hasSame(now.plus({ days: 1 }), 'day')) label = 'Tomorrow';

    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(msg);
  }

  return grouped;
};

export default function ScheduledSendsList() {
  const { scheduled, mutate } = useMetrics();
  const handleDelete = async (id: string) => {
    const confirm = window.confirm(
      'Are you sure you want to delete this scheduled message?',
    );
    if (!confirm) return;

    mutate(
      async (currentData: MetricsData | undefined): Promise<MetricsData> => {
        if (!currentData) throw new Error('No data to update');
        await axios.delete('/api/schedule-del', { data: { id } });
        return {
          ...currentData,
          scheduled: currentData.scheduled.filter((msg) => msg.id !== id),
        };
      },
      {
        optimisticData: (currentData: MetricsData) => {
          if (!currentData) return undefined;
          return {
            ...currentData,
            scheduled: currentData.scheduled.filter((msg) => msg.id !== id),
          };
        },
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      },
    );
  };

  const grouped = groupByDate(scheduled.slice(0, 5));

  return (
    <div className="rounded-xl bg-gray-800 p-4 shadow-sm md:p-6">
      {Object.entries(grouped).map(([label, items]) => (
        <div key={label} className="mb-4">
          <p className="mb-2 text-sm font-medium text-gray-400">{label}</p>
          <ul className="space-y-3">
            {items.map((item) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded border border-gray-700 bg-gray-900 p-3 text-sm shadow-sm md:p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-wrap gap-1 font-mono break-words text-gray-100">
                    {item.to_number.map((num, idx) => (
                      <span
                        key={idx}
                        className="inline-block rounded border border-gray-700 bg-gray-950 px-2 py-0.5 text-xs text-pink-200 md:text-sm"
                      >
                        ⌜{num}⌟
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-gray-500 transition hover:text-pink-500"
                    aria-label="Delete scheduled message"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-2 truncate text-gray-300">{item.message}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {DateTime.fromISO(item.scheduled_at)
                    .setZone('Africa/Nairobi')
                    .toFormat('hh:mm a')}
                </p>
              </motion.li>
            ))}
          </ul>
        </div>
      ))}

      {scheduled.length === 0 && (
        <p className="text-sm text-gray-500">No upcoming scheduled messages.</p>
      )}
    </div>
  );
}
