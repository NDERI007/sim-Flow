'use client';

import { useState } from 'react';
import ContactGroupSelector from './ContactSelcector';
import axios from 'axios';
import { CalendarClock } from 'lucide-react';
import { useSmsStore } from '../../lib/smsStore';
import { group } from 'console';

export default function SmsForm() {
  const {
    manualNumbers,
    setManualNumbers,
    selectedGroup,
    message,
    setMessage,
    resetForm,
  } = useSmsStore();

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const manualList = manualNumbers
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter(Boolean);

    const contactGroupIDs = selectedGroup.map((group) => group.id);

    if (
      !message.trim() ||
      (manualList.length === 0 && contactGroupIDs.length === 0)
    ) {
      setFeedback(
        '❌ Message and at least one phone number or group is required.',
      );
      return;
    }

    setLoading(true);
    setFeedback('');

    try {
      const res = await axios.post('/api/send-sms', {
        to_number: manualList,
        message,
        scheduledAt: scheduledAt || null,
        contact_group_ids: contactGroupIDs.length > 0 ? contactGroupIDs : null,
      });

      if (res.status !== 200) {
        throw new Error(res.data?.error || 'Failed to send SMS');
      }

      setFeedback('✅ Message queued successfully!');
      setScheduledAt('');
      resetForm();
    } catch (err: any) {
      setFeedback(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl bg-slate-950 p-6 text-gray-200 shadow-xl"
    >
      <ContactGroupSelector />

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-500">
          Phone Numbers
        </label>
        <textarea
          value={manualNumbers}
          onChange={(e) => setManualNumbers(e.target.value)}
          placeholder="Enter phone numbers separated by commas or new lines"
          className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-pink-900"
          rows={5}
        />

        <label className="mt-4 mb-2 block text-sm font-medium text-gray-500">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          className="w-full rounded-lg bg-gray-900 p-3 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-pink-900"
          rows={5}
          placeholder="Type your message here..."
        />

        <label className="mt-4 mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
          <CalendarClock size={20} /> Schedule for
        </label>
        <input
          type="datetime-local"
          name="scheduled_at"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full rounded-md bg-[#1a1a1a] p-2 text-white outline-none focus:ring-2 focus:ring-pink-900"
        />
        {scheduledAt && (
          <button
            type="button"
            onClick={() => setScheduledAt('')}
            className="mt-2 text-sm text-pink-300 underline"
          >
            ❌ Clear schedule
          </button>
        )}
      </div>

      {feedback && (
        <p
          className={`font-medium ${
            feedback.includes('✅') ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {feedback}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full cursor-pointer rounded-lg bg-pink-900 py-3 font-semibold text-white transition hover:bg-pink-800 disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Send SMS'}
      </button>
    </form>
  );
}
