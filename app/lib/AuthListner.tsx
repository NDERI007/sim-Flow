'use client';

import { useEffect } from 'react';
import { useAuthStore } from './AuthStore';

export function AuthWrapper() {
  const getUser = useAuthStore((s) => s.getUser);
  const hydrated = useAuthStore((s) => s.hydrated);

  // Trigger getUser once store is hydrated
  useEffect(() => {
    if (hydrated) {
      getUser();
    }
    console.log('✅ AuthStore hydrated?', hydrated);
  }, [hydrated, getUser]);

  return null;
}
