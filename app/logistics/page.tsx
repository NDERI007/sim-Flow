// app/logistics/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function LogisticsPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) {
        console.error(error);
      } else {
        setMessages(data);
      }

      setLoading(false);
    };

    fetchMessages();
  }, []);

  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-fuchsia-700">
        SMS Logistics
      </h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border text-sm">
            <thead>
              <tr className="bg-fuchsia-200">
                <th className="border px-4 py-2">To</th>
                <th className="border px-4 py-2">Message</th>
                <th className="border px-4 py-2">Status</th>

                <th className="border px-4 py-2">Sent</th>
                <th className="border px-4 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id}>
                  <td className="border px-4 py-2">{msg.to_number}</td>
                  <td className="border px-4 py-2">{msg.message}</td>
                  <td className="border px-4 py-2">
                    <span
                      className={`inline-block rounded px-2 py-1 text-white ${
                        msg.status === 'sent'
                          ? 'bg-green-500'
                          : msg.status === 'queued'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                    >
                      {msg.status}
                    </span>
                  </td>

                  <td className="border px-4 py-2">
                    {msg.sent_at?.slice(0, 19) || '-'}
                  </td>
                  <td className="border px-4 py-2 text-red-600">
                    {msg.error || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
