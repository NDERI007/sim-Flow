'use client';

import { useState } from 'react';
import { useSmsStore } from '@/app/lib/smsStore';
import InputMethodSelector from '../components/SMS-comp/InputMethod';
import ContactGroupSelector from '../components/SMS-comp/ContactSelcector';

import axios from 'axios';

export default function SendSmsPage() {
  const { selectedGroup, message, setMessage, resetForm } = useSmsStore();

  const manualNumbers = useSmsStore((s) => s.manualNumbers);
  const setManualNumbers = useSmsStore((s) => s.setManualNumbers);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const parsedManualNumbers = manualNumbers
    .split(/[\n,]+/) // split on commas or new lines
    .map((num) => num.trim())
    .filter((num) => num !== '');

  const allRecipients = [
    ...parsedManualNumbers,
    ...selectedGroup.flatMap((g) => g.contacts),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || allRecipients.length === 0) {
      setFeedback('❌ Message and recipients are required.');
      return;
    }

    setLoading(true);
    setFeedback('');

    try {
      const res = await axios.post('/api/send-sms', {
        to_numbers: allRecipients,
        message,
        scheduledAt: scheduledAt || null,
      });
      console.log(res);

      if (res.status !== 200) {
        throw new Error(res.data?.error || 'Failed to send SMS');
      }

      setFeedback('✅ Message queued successfully!');
      setScheduledAt('');
      resetForm(); // Reset store state
    } catch (err: any) {
      setFeedback(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold text-gray-800">Send SMS</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Input Method Switch */}
        <InputMethodSelector />

        {/* 2. Contact Input */}
        <ContactGroupSelector />

        {/* 3. Message Input */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Phone Numbers
          </label>
          <textarea
            value={manualNumbers}
            onChange={(e) => setManualNumbers(e.target.value)}
            placeholder="Enter phone numbers separated by commas or new lines"
            className="w-full rounded-xl bg-gray-100 px-4 py-3 text-sm outline-none"
            rows={5}
          />
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="w-full rounded-lg bg-gray-100 p-3 outline-none"
            rows={5}
            placeholder="Type your message here..."
          />
          <label className="mb-2 block text-sm font-medium">
            Schedule for (optional):
          </label>
          <input
            type="datetime-local"
            name="scheduled_at"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded border p-2"
          />
          {scheduledAt && (
            <button
              type="button"
              onClick={() => setScheduledAt('')}
              className="mt-2 text-sm text-gray-600 underline"
            >
              ❌ Clear schedule
            </button>
          )}
        </div>

        {/* 4. Feedback Message */}
        {feedback && (
          <p
            className={`font-medium ${
              feedback.includes('✅') ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {feedback}
          </p>
        )}

        {/* 6. Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white shadow-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send SMS'}
        </button>
      </form>
    </div>
  );
}
