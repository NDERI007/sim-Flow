'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
import axios from 'axios';

interface ScheduledMessage {
  id: string;
  to_number: string[];
  message: string;
  scheduled_at: string;
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
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([]);

  const handleDelete = async (id: string) => {
    const confirm = window.confirm(
      'Are you sure you want to delete this scheduled message?',
    );
    if (!confirm) return;

    try {
      await axios.delete('/api/schedule-del', { data: { id } });
      setScheduled((prev) => prev.filter((msg) => msg.id !== id));
    } catch (err) {
      console.error('❌ Failed to delete:', err);
      alert('Failed to delete scheduled message.');
    }
  };

  useEffect(() => {
    axios
      .get('/api/metrics')
      .then((res) => setScheduled(res.data.scheduled))
      .catch((err) => console.error('❌ Failed to fetch scheduled:', err));
  }, []);

  const grouped = groupByDate(scheduled.slice(0, 5));

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <CalendarClock className="h-5 w-5 text-purple-600" /> Scheduled Sends
      </h2>

      {Object.entries(grouped).map(([label, items]) => (
        <div key={label} className="mb-4">
          <p className="mb-2 text-sm font-medium text-gray-600">{label}</p>
          <ul className="space-y-2">
            {items.map((item) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded border border-gray-200 p-3 text-sm shadow-sm"
              >
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-400 transition hover:text-red-500"
                  aria-label="Delete scheduled message"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex flex-wrap font-medium text-gray-800">
                  {Array.isArray(item.to_number) ? (
                    item.to_number.map((num, idx) => (
                      <span
                        key={idx}
                        className="mr-1 inline-block rounded border border-gray-300 px-3 py-1 text-sm font-medium shadow-sm"
                      >
                        ⌜{num}⌟
                      </span>
                    ))
                  ) : (
                    <span className="inline-block rounded border border-gray-300 px-2 py-0.5 text-sm font-medium shadow-sm">
                      ⌜{item.to_number}⌟
                    </span>
                  )}
                </div>

                <span className="block truncate text-gray-600">
                  {item.message}
                </span>
                <span className="block text-xs text-gray-400">
                  {DateTime.fromISO(item.scheduled_at)
                    .setZone('Africa/Nairobi')
                    .toFormat('hh:mm a')}
                </span>
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
