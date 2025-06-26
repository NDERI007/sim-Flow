'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock } from 'lucide-react';
import { DateTime } from 'luxon';
import axios from 'axios';

interface ScheduledMessage {
  id: string;
  to: string;
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
                <span className="block font-medium text-gray-800">
                  📱 {item.to}
                </span>
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
