'use client';

import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
import axios from 'axios';
import { useMetrics } from '../../lib/metrics';

interface ScheduledMessage {
  id: string;
  message: string;
  scheduled_at: string;
  group_names?: string[] | null;
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
        optimisticData: (currentData) => {
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
    <div className="rounded-xl bg-slate-950 p-4 text-gray-300 md:p-6">
      {Object.entries(grouped).map(([label, items]) => (
        <div key={label} className="mb-6">
          <p className="mb-3 text-sm font-semibold text-gray-400">{label}</p>

          <ul className="space-y-4">
            {items.map((item) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl bg-[#0f0f0f] p-4 shadow-inner"
              >
                <div className="flex items-start justify-between">
                  <div className="flex w-full flex-col gap-2">
                    <p className="line-clamp-2 text-sm text-gray-200">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {' '}
                        {DateTime.fromISO(item.scheduled_at)
                          .setZone('Africa/Nairobi')
                          .toFormat('hh:mm a')}
                      </span>

                      <span
                        className={`rounded px-2 py-0.5 text-sm ${
                          item.group_names?.length
                            ? 'bg-pink-900/10 text-pink-400'
                            : 'bg-gray-800 text-gray-400 italic'
                        }`}
                      >
                        {item.group_names?.join() || 'Ungrouped'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="mt-1 ml-4 text-gray-500 hover:text-pink-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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
