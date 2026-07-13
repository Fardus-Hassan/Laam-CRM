'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { env } from '@/config/env';
import { SessionBootScreen } from '@/features/auth/components/session-boot-screen';
import { useAuthContext } from '@/features/auth/providers/auth-provider';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (!env.useApi || status !== 'unauthenticated') {
      return;
    }
    if (pathname === '/login' || pathname.startsWith('/login/')) {
      return;
    }
    const search = searchParams?.toString();
    const next = `${pathname}${search ? `?${search}` : ''}`;
    const loginUrl = `/login?next=${encodeURIComponent(next)}`;
    router.replace(loginUrl);
  }, [status, router, pathname, searchParams]);

  if (env.useApi && status === 'loading') {
    return <SessionBootScreen />;
  }

  if (env.useApi && status === 'unauthenticated') {
    return <SessionBootScreen message="Redirecting to sign in…" />;
  }

  return <>{children}</>;
}
