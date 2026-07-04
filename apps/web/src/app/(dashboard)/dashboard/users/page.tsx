import { PageShell } from '@/components/layout/page-shell';
import { TeamAdminShell } from '@/features/rbac/components/team-admin-shell';

export default function UsersPage() {
  return (
    <PageShell
      title="Team & Admins"
      description="Create teams, assign leaders and agents, invite members, and manage permissions."
    >
      <TeamAdminShell />
    </PageShell>
  );
}
