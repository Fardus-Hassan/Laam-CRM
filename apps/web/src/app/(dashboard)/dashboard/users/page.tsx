import { PageShell } from '@/components/layout/page-shell';
import { TeamAdminShell } from '@/features/rbac/components/team-admin-shell';

type UsersPageProps = {
  searchParams?: Promise<{ view?: string }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const focusUsers = params?.view === 'team';

  return (
    <PageShell
      title="Users"
      description={
        focusUsers
          ? 'Invite users for any role, control permissions, and manage access in bulk.'
          : 'Invite users, manage teams, and control role permissions.'
      }
    >
      <TeamAdminShell />
    </PageShell>
  );
}
