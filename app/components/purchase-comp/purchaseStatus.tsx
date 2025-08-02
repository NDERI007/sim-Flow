'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function PurchaseStatus() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const status = searchParams.get('status');
    const error = searchParams.get('reason');

    if (status === 'success') {
      toast.success('Purchase successful!');
    } else if (status === 'error') {
      toast.error(decodeURIComponent(error ?? 'Payment failed'));
    }

    if (status) {
      const timeout = setTimeout(() => {
        router.replace('/purchase'); // Clean up the URL
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [searchParams, router]);

  return null; // No need to render anything
}
