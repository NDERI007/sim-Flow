'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
  groups: ContactGroup[] | null;
  failed_contacts: FailedContact[] | null;
};

export default function DailyRE() {
  const [groupedMessages, setGroupedMessages] = useState<
    Record<string, Message[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <p>Loading messages...</p>;
  if (error)
    return <p className="text-red-500">Failed to load messages: {error}</p>;

  return (
    <div>
      {Object.entries(groupedMessages).map(([status, messages]) => (
        <div key={status} className="mb-8">
          <h2 className="mb-2 text-lg font-semibold capitalize">{status}</h2>
          <ul>
            {messages.map((msg) => (
              <li key={msg.id} className="border-b p-4">
                <p>{msg.message}</p>
                <p className="text-sm text-gray-500">
                  {new Date(msg.created_at).toLocaleString()}
                </p>

                {/* Group badges (already deduplicated by backend) */}
                {msg.groups?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.groups.map((group) => (
                      <span
                        key={`${msg.id}-${group.id}`}
                        className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
                      >
                        {group.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Failed contact info (array of failed_contacts) */}
                {msg.status === 'failed' && msg.failed_contacts?.length > 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    {msg.failed_contacts.map((contact, idx) => (
                      <p key={`${msg.id}-fail-${idx}`}>
                        Failed for: {contact.name} ({contact.phone}) —{' '}
                        {contact.error}
                      </p>
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
