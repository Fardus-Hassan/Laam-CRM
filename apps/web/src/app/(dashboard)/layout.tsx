import { AppProviders } from '@/components/providers/app-providers';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AuthGate } from '@/features/auth/components/auth-gate';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <AuthGate>
        <DashboardShell>{children}</DashboardShell>
      </AuthGate>
    </AppProviders>
  );
}
