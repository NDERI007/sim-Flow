import { useState } from 'react';
import axios from 'axios';
import { Wallet } from 'lucide-react';

export default function PurchaseForm() {
  const [amount, setAmount] = useState(100); // in KES
  const [loading, setLoading] = useState(false);

  const pricePerSms = 0.5;
  const credits = Math.floor(amount / pricePerSms);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post('/api/initiate', {
        credits,
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
          <label htmlFor="amount" className="mb-1 block text-sm text-zinc-300">
            Amount (KES)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400">
              <Wallet size={18} />
            </span>
            <input
              id="amount"
              type="number"
              min={4}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Minimum 4 KES"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
          {amount > 0 && amount < 4 && (
            <p className="mt-1 text-sm text-red-500">Minimum amount is KES 3</p>
          )}
        </div>

        {/* SMS Credits Preview */}
        <div className="font-mono text-sm text-green-400">
          You&apos;ll receive <span className="font-semibold">{credits}</span>{' '}
          SMS credit{credits !== 1 ? 's' : ''}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || credits <= 0 || amount < 3}
          className="w-full rounded-md bg-green-500 py-2 font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Continue to Payment'}
        </button>
      </form>
    </div>
  );
}
