'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

export default function UsageBillingPage() {
  const [quota, setQuota] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const { data } = await axios.get('/api/usage');
        setQuota(data.quota);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch usage data.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuota();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-fuchsia-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-md">
        <h2 className="mb-4 text-center text-2xl font-bold text-fuchsia-700">
          Usage & Billing
        </h2>

        {loading ? (
          <p className="text-center">Loading...</p>
        ) : error ? (
          <p className="text-center text-red-600">❌ {error}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="font-semibold">Remaining Quota:</span>
              <span>{quota} SMS</span>
            </div>

            <hr />

            <div className="text-sm text-gray-600">
              <p>
                You are on a <strong>Basic Plan</strong>. Each SMS segment is
                160 characters.
              </p>
              <p className="mt-2">
                Need more credits? Contact support or upgrade your plan.
              </p>
            </div>

            <button className="w-full rounded bg-fuchsia-700 py-2 text-white hover:bg-fuchsia-500">
              Upgrade Plan
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
