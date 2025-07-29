'use client';

import { useSearchParams } from 'next/navigation';
import VerifyMfa from '../components/MFA-comp/verifyMFA';
import SetupMfa from '../components/MFA-comp/SetUp';

export default function MfaPage() {
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step') as 'setup' | 'verify' | null;

  if (!stepParam) return null;

  return (
    <div className="mx-auto mt-10 max-w-md">
      {stepParam === 'setup' ? (
        <SetupMfa onNext={() => (window.location.href = '/mfa?step=verify')} />
      ) : (
        <VerifyMfa />
      )}
    </div>
  );
}
