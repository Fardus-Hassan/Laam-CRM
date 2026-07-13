'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { canAccessPath } from '@/features/auth/lib/path-permissions';
import { Button } from '@/components/ui/button';
import { isPlatformHost } from '@/lib/tenant';

export function PermissionRouteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, permissions, user } = useAuth();

  const isPlatformRoute = Boolean(pathname?.startsWith('/dashboard/platform'));
  const platformAllowed =
    user?.role === 'super_admin' && isPlatformHost();

  const allowed =
    status !== 'authenticated' ||
    !pathname ||
    (isPlatformRoute ? platformAllowed : canAccessPath(pathname, permissions));

  if (status === 'loading') {
    return children;
  }

  if (!allowed) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-start gap-4 py-16">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          Your role ({user?.role ?? 'unknown'}) does not have permission to view this page.
        </p>
        <Button type="button" onClick={() => router.replace('/dashboard')}>
          Go to dashboard
        </Button>
      </div>
    );
  }

  return children;
}
