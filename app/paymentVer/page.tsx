'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';

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
        const { data } = await axios.get(
          `/api/payment-verif?reference=${reference}`,
        );

        if (data.success) {
          setStatus('success');
          setTimeout(() => router.push('/admin'), 2000);
        } else {
          setStatus('failed');
        }
      } catch (err) {
        const error = err as AxiosError;

        if (error.response) {
          console.error(
            'Payment verification failed (response):',
            error.response.data,
          );
        } else if (error.request) {
          console.error('No response received:', error.request);
        } else {
          console.error('Request setup error:', error.message);
        }

        setStatus('failed');
      }
    }

    verifyPayment();
  }, [router, searchParams]);

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
