'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PurchaseForm from '../components/purchase-comp/purchaseForm';

export default function PurchasePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = searchParams.get('status');
    const e = searchParams.get('error');

    if (s) setStatus(decodeURIComponent(s));
    if (e) setError(decodeURIComponent(e));

    // Clean up the URL after 3 seconds
    if (s || e) {
      const timeout = setTimeout(() => {
        router.replace('/purchase');
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [searchParams, router]);

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      {status && (
        <div className="mb-4 rounded-lg bg-green-600 px-4 py-3 text-white shadow">
          ✅ {status}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-600 px-4 py-3 text-white shadow">
          ❌ {error}
        </div>
      )}

      <PurchaseForm />
    </div>
  );
}
