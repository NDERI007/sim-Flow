'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetchMessages } from '../lib/messenger'; // utility function
import { DateTime } from 'luxon';

type Message = {
  id: string;
  to_number: string[];
  message: string;
  status: 'sent' | 'failed' | 'scheduled';
  created_at: string;
  archived: boolean;
};

const groupByDate = (messages: Message[]) => {
  return messages.reduce(
    (acc, msg) => {
      const dateKey = DateTime.fromISO(msg.created_at, {
        zone: 'Africa/Nairobi',
      }).toFormat('dd MMM yyyy');

      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(msg);
      return acc;
    },
    {} as Record<string, Message[]>,
  );
};

const exportToCSV = (messages: Message[]) => {
  const headers = ['Phone', 'Message', 'Status', 'Created At'];
  const rows = messages.map((msg) => [
    Array.isArray(msg.to_number) ? msg.to_number.join(', ') : msg.to_number,
    msg.message,
    msg.status,
    DateTime.fromISO(msg.created_at, { zone: 'Africa/Nairobi' }).toFormat(
      'dd MMM yyyy, hh:mm a',
    ),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'sms_delivery_report.csv';
  link.click();
};

export default function DeliveryReport() {
  const {
    data: messages,
    error,
    isLoading,
    mutate,
  } = useSWR('messages', fetchMessages);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'sent' | 'failed' | 'scheduled'
  >('all');

  const filteredMessages = useMemo(() => {
    return messages?.filter((msg) =>
      statusFilter === 'all' ? true : msg.status === statusFilter,
    );
  }, [messages, statusFilter]);

  const groupedMessages = useMemo(() => {
    return groupByDate(filteredMessages ?? []);
  }, [filteredMessages]);

  if (isLoading) return <p className="text-gray-400">Loading messages...</p>;
  if (error) return <p className="text-red-500">Failed to load messages</p>;

  return (
    <div className="p-6 text-gray-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-white">Delivery Report</h1>

        <div className="flex gap-2">
          <button
            onClick={() => mutate()}
            className="rounded bg-blue-600 px-4 py-1 text-white hover:bg-blue-700"
          >
            Refresh
          </button>
          <button
            onClick={() => exportToCSV(filteredMessages ?? [])}
            className="rounded bg-green-700 px-4 py-1 text-white hover:bg-green-800"
          >
            Export
          </button>
        </div>
      </div>

      <div className="mb-4">
        <select
          className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">All</option>
          <option value="sent">Sent</option>
          <option value="scheduled">Scheduled</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {filteredMessages?.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-xl bg-slate-800 p-4 shadow-md transition-all ${
              msg.archived ? 'opacity-50 grayscale' : ''
            }`}
          >
            <div className="flex flex-wrap items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">
                  {Array.isArray(msg.to_number)
                    ? msg.to_number.join(', ')
                    : msg.to_number}
                </p>
                <p className="text-sm text-gray-300">{msg.message}</p>
              </div>

              <div className="flex flex-col items-end gap-1 text-right">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${
                    msg.status === 'sent'
                      ? 'bg-green-900 text-green-200'
                      : msg.status === 'scheduled'
                        ? 'bg-yellow-900 text-yellow-200'
                        : 'bg-red-900 text-red-200'
                  }`}
                >
                  {msg.status}
                </span>
                <span className="text-xs text-gray-400">
                  {DateTime.fromISO(msg.created_at, {
                    zone: 'Africa/Nairobi',
                  }).toFormat('dd MMM, hh:mm a')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
