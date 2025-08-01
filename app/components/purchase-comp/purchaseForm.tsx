'use client';

import { Wallet } from 'lucide-react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';

const PurchaseSchema = z.object({
  amount: z.number().min(4, 'Minimum is KES 4'),
});

type Purchase = z.infer<typeof PurchaseSchema>; // <-- derive from schema
export default function PurchaseForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Purchase>({
    resolver: zodResolver(PurchaseSchema),
    defaultValues: {
      amount: 100,
    },
  });

  const [serverError, setServerError] = useState('');

  const amount = watch('amount') ?? 0;
  const credits = Math.floor((amount || 0) / 0.5);

  const onSubmit = async () => {
    setServerError('');

    try {
      const { data } = await axios.post('/api/initiate', { credits });

      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else if (data?.error) {
        // Handle known backend errors
        setServerError(`Failed to initiate payment: ${data.error}`);
      } else {
        setServerError('Unexpected response from Paystack. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);

      if (axios.isAxiosError(err)) {
        const res = err.response?.data;

        // 🧠 Handle Zod-style backend validation issues
        if (res?.issues) {
          const issueList = Object.entries(res.issues)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('\n');
          setServerError(`Validation Error:\n${issueList}`);
          return;
        }

        // Handle Paystack-specific failure
        if (res?.error?.includes('Paystack')) {
          setServerError(`Payment error: ${res.error}`);
          return;
        }

        setServerError(
          res?.error ||
            res?.message ||
            'Something went wrong while initiating payment.',
        );
      } else {
        setServerError('An unknown error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-zinc-900 p-6 text-white shadow-md">
      <div className="mb-4">
        <p className="font-mono text-sm text-zinc-400">
          1 SMS = KES <span className="font-semibold text-green-400">0.50</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
              step="1"
              placeholder="Minimum 3 KES"
              {...register('amount', { valueAsNumber: true })}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-sm text-red-500">{errors.amount.message}</p>
          )}
        </div>

        {/* SMS Credits Preview */}
        <div className="font-mono text-sm text-green-400">
          You&apos;ll receive <span className="font-semibold">{credits}</span>{' '}
          SMS credit{credits !== 1 ? 's' : ''}
        </div>

        {/* Server error */}
        {serverError && <p className="text-sm text-red-500">{serverError}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || credits <= 0}
          className="w-full rounded-md bg-green-500 py-2 font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Processing...' : 'Continue to Payment'}
        </button>
      </form>
    </div>
  );
}
