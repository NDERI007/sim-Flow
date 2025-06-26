'use client';

import SmsForm from '../components/SMS-comp/SMS-form';

export default function SendSmsPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="font-Semibold text-3xl text-gray-300">Send SMS</h1>
        <SmsForm />
      </div>
    </div>
  );
}
