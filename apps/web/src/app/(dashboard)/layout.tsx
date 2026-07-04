import { AppProviders } from '@/components/providers/app-providers';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <DashboardShell>{children}</DashboardShell>
    </AppProviders>
  );
}
