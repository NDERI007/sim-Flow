'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from './AuthStore';

export function AuthGuard<P>(
  WrappedComponent: (props: P) => React.ReactElement,
  options: { redirectTo?: string; allowExpired?: boolean } = {},
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter();
    const { user, initialized, lastAuthAt } = useAuthStore();
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
      if (!initialized) return; // Wait until AuthWrapper hydrates

      if (!options.allowExpired) {
        const lastSignedIn = lastAuthAt; // fallback to derived if needed

        if (lastSignedIn) {
          const lastSignInDate = new Date(lastSignedIn);
          const twoMonthsAgo = new Date();
          twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

          if (lastSignInDate < twoMonthsAgo) {
            router.push(options.redirectTo ?? '/login');
            return;
          }
        }
      }

      setAllowed(true);
    }, [initialized, user, lastAuthAt, router]);

    if (!initialized || !allowed) return null;

    return <WrappedComponent {...props} />;
  };
}
