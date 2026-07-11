'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { env } from '@/config/env';
import { useAuthContext } from '@/features/auth/providers/auth-provider';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!env.useApi || status !== 'unauthenticated') {
      return;
    }
    if (pathname === '/login') {
      return;
    }
    router.replace('/login');
  }, [status, router, pathname]);

  if (env.useApi && status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  if (env.useApi && status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm text-muted-foreground">Session expired. Redirecting to sign in…</p>
      </div>
    );
  }

  return <>{children}</>;
}
