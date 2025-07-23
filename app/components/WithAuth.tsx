'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { User } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

type WithAuthGuardOptions = {
  redirectTo?: string;
  allowExpired?: boolean; // if true, skip sign-in-at expiry check
};

export function withAuthGuard<P>(
  WrappedComponent: (props: P & { user: User }) => React.ReactElement,
  options: WithAuthGuardOptions = {},
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    useEffect(() => {
      const checkAuth = async () => {
        // Hydrate session from cookies
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          router.push(options.redirectTo ?? '/unAuth');
          return;
        }

        const user = session.user;

        if (!options.allowExpired) {
          const lastSignIn = user.last_sign_in_at;
          const twoMonthsAgo = new Date();
          twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

          if (lastSignIn && new Date(lastSignIn) < twoMonthsAgo) {
            await supabase.auth.signOut();
            router.push(options.redirectTo ?? '/unAuth');
            return;
          }
        }

        setUser(user);
        setLoading(false);
      };

      checkAuth();
    }, [router]);

    if (loading || !user) return null; // Or a spinner/loading screen

    return <WrappedComponent {...props} user={user} />;
  };
}
