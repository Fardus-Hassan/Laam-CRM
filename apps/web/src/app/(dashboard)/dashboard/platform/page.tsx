import { PageShell } from '@/components/layout/page-shell';
import { PlatformShell } from '@/features/platform/components/platform-shell';

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
      <PlatformShell activeTab={params?.tab} />
    </PageShell>
  );
}
