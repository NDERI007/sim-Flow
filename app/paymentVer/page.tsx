'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>(
    'verifying',
  );

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (!reference) {
      setStatus('failed');
      return;
    }

    async function verifyPayment() {
      try {
        const { data } = await axios.post('/api/payment-verif', {
          reference,
        });
        if (data.success) {
          setStatus('success');
          setTimeout(() => router.push('/dashboard'), 2000);
        } else {
          setStatus('failed');
        }
      } catch (err) {
        setStatus('failed');
      }
    }

    verifyPayment();
  }, []);

  return (
    <div className="p-6 text-center text-white">
      {status === 'verifying' && <p>Verifying your payment...</p>}
      {status === 'success' && (
        <p className="text-green-400">Payment successful! Redirecting...</p>
      )}
      {status === 'failed' && (
        <p className="text-red-500">
          Payment verification failed. Please contact support.
        </p>
      )}
    </div>
  );
}
