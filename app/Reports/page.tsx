'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/BrowserClient';

type ContactGroup = {
  id: string;
  name: string;
};

type FailedContact = {
  name: string;
  phone: string;
  error: string;
};

type Message = {
  id: string;
  message: string;
  status: string;
  created_at: string;
  error: string | null;
  failed_at: string | null;
  scheduled_at: string | null;
  is_archived: boolean;
  groups: ContactGroup[] | null;
  failed_contacts: FailedContact[] | null;
};

const getBadgeClasses = (status: string) => {
  switch (status) {
    case 'sent':
      return 'bg-green-900 text-green-300 border border-green-600';
    case 'failed':
      return 'bg-red-900 text-red-300 border border-red-600';
    case 'scheduled':
      return 'bg-purple-900 text-purple-300 border border-purple-600';
    default:
      return 'bg-gray-800 text-gray-300 border border-gray-600';
  }
};

export default function DeliveryReport() {
  const [groupedMessages, setGroupedMessages] = useState<
    Record<string, Message[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');

  useEffect(() => {
    async function fetchGroupedMessages() {
      const { data, error } = await supabase.rpc('get_delivery_report_json', {
        p_limit: 50,
      });

      if (error) {
        console.error('❌ Supabase RPC Error:', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      const grouped = new Map<string, Message[]>();
      for (const msg of data as Message[]) {
        if (!grouped.has(msg.status)) grouped.set(msg.status, []);
        grouped.get(msg.status)!.push(msg);
      }

      setGroupedMessages(Object.fromEntries(grouped));
      setLoading(false);
    }

    fetchGroupedMessages();
  }, []);

  if (loading) return <p className="p-6 text-gray-400">Loading messages...</p>;
  if (error)
    return <p className="p-6 text-red-400">Failed to load messages: {error}</p>;

  const visibleStatuses = ['all', ...Object.keys(groupedMessages)];

  return (
    <div className="min-h-screen space-y-8 bg-gray-950 p-6 text-gray-200">
      <div className="flex flex-wrap gap-2">
        {visibleStatuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              statusFilter === s
                ? 'border-pink-500 bg-pink-900/10 text-pink-400'
                : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {Object.entries(groupedMessages)
        .filter(([status]) => statusFilter === 'all' || statusFilter === status)
        .map(([status, messages]) => (
          <div key={status}>
            <h2 className="mb-4 text-xl font-bold text-gray-100 capitalize">
              {status} ({messages.length})
            </h2>

            <ul className="space-y-4">
              {messages.map((msg) => (
                <li
                  key={msg.id}
                  className={`rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-sm transition hover:shadow-md ${
                    msg.is_archived ? 'opacity-60 grayscale' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-gray-200">{msg.message}</p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${getBadgeClasses(
                        msg.status,
                      )}`}
                    >
                      {msg.status}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-gray-400">
                    Sent at: {new Date(msg.created_at).toLocaleString()}
                  </p>

                  {msg.groups?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.groups.map((group) => (
                        <span
                          key={`${msg.id}-${group.id}`}
                          className="rounded-full border border-indigo-600 bg-indigo-900 px-2 py-0.5 text-sm font-medium text-indigo-200 shadow-sm"
                        >
                          {group.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {msg.status === 'failed' &&
                    msg.failed_contacts?.length > 0 && (
                      <div className="mt-3 space-y-1 text-sm text-red-300">
                        {msg.failed_contacts.map((contact, idx) => (
                          <div
                            key={`${msg.id}-fail-${idx}`}
                            className="rounded bg-red-950 px-2 py-1"
                          >
                            ❌ {contact.name} ({contact.phone}): {contact.error}
                          </div>
                        ))}
                      </div>
                    )}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
