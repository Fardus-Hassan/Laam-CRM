import { PageShell } from '@/components/layout/page-shell';
import { UsersAdminPanel } from '@/features/rbac/components/users-admin-panel';

export default function UsersPage() {
  return (
    <PageShell
      title="Team"
      description="Manage users, assign roles, and grant extra permissions per person."
    >
      <UsersAdminPanel />
    </PageShell>
  );
}
