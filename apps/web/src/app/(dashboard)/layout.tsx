import { AppProviders } from '@/components/providers/app-providers';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AuthGate } from '@/features/auth/components/auth-gate';
import { PermissionRouteGate } from '@/features/auth/components/permission-route-gate';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <AuthGate>
        <DashboardShell>
          <PermissionRouteGate>{children}</PermissionRouteGate>
        </DashboardShell>
      </AuthGate>
    </AppProviders>
  );
}
