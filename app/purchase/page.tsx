'use client';

import { Suspense } from 'react';
import PurchaseForm from '../components/purchase-comp/purchaseForm';
import { PurchaseStatus } from '../components/purchase-comp/purchaseStatus';
import RecentPurchase from '../components/purchase-comp/RecentPurchase';

export default function PurchasePage() {
  return (
    <main className="min-h-screen bg-gray-900 px-4 py-6 text-gray-100 text-gray-900 transition-colors">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Suspense fallback={null}>
          <PurchaseStatus />
        </Suspense>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Left side: Form */}
          <div className="w-full">
            <PurchaseForm />
          </div>

          {/* Right side: Recent Purchases */}
          <div className="w-full">
            <RecentPurchase />
          </div>
        </div>
      </div>
    </main>
  );
}
