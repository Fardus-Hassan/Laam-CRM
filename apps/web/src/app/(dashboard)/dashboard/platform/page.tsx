import { PageShell } from '@/components/layout/page-shell';
import { PlatformTenantsPanel } from '@/features/platform/components/platform-tenants-panel';

type PlatformPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function PlatformPage({ searchParams }: PlatformPageProps) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <PageShell
      title="Platform"
      description="Super Admin controls for tenants, onboarding, and system health."
    >
      <PlatformTenantsPanel initialTab={params?.tab} />
    </PageShell>
  );
}
