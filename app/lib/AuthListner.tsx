// app/lib/AuthInitializer.tsx
'use client';

import { useEffect } from 'react';
import { useAuthStore } from './AuthStore';

export function AuthInitializer() {
  const getUser = useAuthStore((state) => state.getUser);

  useEffect(() => {
    getUser(); // only once on initial mount
  }, [getUser]);

  return null;
}
