import { PageShell } from '@/components/layout/page-shell';
import { TeamAdminShell } from '@/features/rbac/components/team-admin-shell';

type UsersPageProps = {
  searchParams?: Promise<{ view?: string }>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const agentsMode = params?.view === 'team';

  return (
    <PageShell
      title={agentsMode ? 'Team agents' : 'Team & admins'}
      description={
        agentsMode
          ? 'Sales agents — call center staff who confirm orders and receive lead distribution.'
          : 'Create teams, assign leaders, invite all members, and manage permissions.'
      }
    >
      <TeamAdminShell />
    </PageShell>
  );
}
