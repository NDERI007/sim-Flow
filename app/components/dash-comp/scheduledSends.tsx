'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { DateTime } from 'luxon';
import { toast } from 'sonner';
import { deleteScheduledMessage } from '../../lib/scheduled/actions';

export interface ScheduledMessage {
  id: string;
  message: string;
  scheduled_at: string;
  group_names?: string[];
}

export function ScheduledList({ messages }: { messages: ScheduledMessage[] }) {
  const [isPending, startTransition] = useTransition();
  const [localMessages, setLocalMessages] = useState(messages);

  const handleDelete = (id: string) => {
    toast.custom((t) => (
      <div className="flex flex-col gap-2 rounded-md bg-white p-4 text-black shadow-lg">
        <span className="text-sm">Delete this scheduled message?</span>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t);
              startTransition(async () => {
                const res = await deleteScheduledMessage(id);
                if (res.success) {
                  toast.success('Message deleted');
                  setLocalMessages((prev) => prev.filter((m) => m.id !== id));
                } else {
                  toast.error(res.error || 'Failed to delete');
                }
              });
            }}
            className="rounded bg-red-500 px-2 py-1 text-sm text-white hover:bg-red-600"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    ));
  };

  const now = DateTime.local().setZone('Africa/Nairobi');
  const grouped = groupByDate(localMessages);

  function groupByDate(messages: ScheduledMessage[]) {
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
  }

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
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      ))}

      {localMessages.length === 0 && (
        <p className="text-sm text-gray-500">No upcoming scheduled messages.</p>
      )}
    </div>
  );
}
