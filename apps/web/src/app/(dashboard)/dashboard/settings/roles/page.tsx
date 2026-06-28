import { PageShell } from '@/components/layout/page-shell';
import { RolesAdminPanel } from '@/features/rbac/components/roles-admin-panel';

export default function RolesSettingsPage() {
  return (
    <PageShell
      title="Roles & Permissions"
      description="Create custom roles, save presets, and control page and action access."
    >
      <RolesAdminPanel />
    </PageShell>
  );
}
