'use client';

import { Suspense } from 'react';
import PurchaseForm from '../components/purchase-comp/purchaseForm';
import { PurchaseStatus } from '../components/purchase-comp/purchaseStatus';

export default function PurchasePage() {
  return (
    <main className="min-h-screen bg-gray-900 px-4 py-6 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      <div className="mx-auto w-full max-w-xl space-y-6">
        <Suspense fallback={null}>
          <PurchaseStatus />
        </Suspense>

        <PurchaseForm />
      </div>
    </main>
  );
}
