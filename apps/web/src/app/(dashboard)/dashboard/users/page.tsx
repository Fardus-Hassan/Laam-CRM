import { PageShell } from '@/components/layout/page-shell';
import { TeamAdminShell } from '@/features/rbac/components/team-admin-shell';

export default function UsersPage() {
  return (
    <PageShell
      title="Team & Admins"
      description="Invite teammates, assign roles, and manage per-user permissions."
    >
      <TeamAdminShell />
    </PageShell>
  );
}
