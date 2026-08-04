import { Suspense } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AuthGate } from '@/features/auth/components/auth-gate';
import { PermissionRouteGate } from '@/features/auth/components/permission-route-gate';
import { SessionBootScreen } from '@/features/auth/components/session-boot-screen';

/** Auth/session providers — never statically prerender dashboard routes. */
export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<SessionBootScreen />}>
      <AuthGate>
        <DashboardShell>
          <PermissionRouteGate>{children}</PermissionRouteGate>
        </DashboardShell>
      </AuthGate>
    </Suspense>
  );
}
