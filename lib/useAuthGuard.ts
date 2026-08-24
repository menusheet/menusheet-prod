'use client';

import { useEffect, useState } from 'react';
import { isAllowedEmail, logoutUser, watchAuth } from '@/lib/firebaseAuth';

export type AuthStatus = 'loading' | 'anon' | 'denied' | 'ok';

interface AuthGuardState {
  status: AuthStatus;
  email: string | null;
  deniedEmail: string | null;
}

export function useAuthGuard(): AuthGuardState {
  const [state, setState] = useState<AuthGuardState>({
    status: 'loading',
    email: null,
    deniedEmail: null,
  });

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    try {
      unsub = watchAuth((user) => {
        if (cancelled) return;
        if (!user) {
          setState({ status: 'anon', email: null, deniedEmail: null });
          return;
        }
        if (!isAllowedEmail(user.email)) {
          const email = user.email;
          setState({ status: 'denied', email, deniedEmail: email });
          void logoutUser();
          return;
        }
        setState({ status: 'ok', email: user.email, deniedEmail: null });
      });
    } catch {
      if (!cancelled) {
        setState({ status: 'anon', email: null, deniedEmail: null });
      }
    }
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  return state;
}
