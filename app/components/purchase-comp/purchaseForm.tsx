import { useState } from 'react';
import axios from 'axios';

export default function PurchaseForm() {
  const [amount, setAmount] = useState(100); // in KES
  const [method, setMethod] = useState('card');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const pricePerSms = 0.5;
  const credits = Math.floor(amount / pricePerSms);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post('/api/initiate', {
        credits,
        method,
        ...(method === 'mpesa' && { phone }),
      });

      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        alert('Something went wrong.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Failed to initiate payment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-zinc-900 p-6 text-white shadow-md">
      <div className="mb-4">
        <p className="font-mono text-sm text-zinc-400">
          1 SMS = KES <span className="font-semibold text-green-400">0.50</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Amount input */}
        <div>
          <label className="mb-1 block text-sm text-zinc-300">
            Amount (KES)
          </label>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
        </div>

        {/* SMS Credits Preview */}
        <div className="font-mono text-sm text-green-400">
          You&apos;ll receive <span className="font-semibold">{credits}</span>{' '}
          SMS credit{credits !== 1 ? 's' : ''}
        </div>

        {/* Payment Method */}
        <div>
          <label className="mb-1 block text-sm text-zinc-300">
            Payment Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
          >
            <option value="card">Card</option>
            <option value="mpesa">MPesa</option>
          </select>
        </div>

        {/* Phone input if MPesa */}
        {method === 'mpesa' && (
          <div>
            <label className="mb-1 block text-sm text-zinc-300">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="e.g. 0712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || credits <= 0}
          className="w-full rounded-md bg-green-500 py-2 font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Continue to Payment'}
        </button>
      </form>
    </div>
  );
}
