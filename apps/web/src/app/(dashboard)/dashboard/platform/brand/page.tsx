'use client';

import { PageShell } from '@/components/layout/page-shell';
import { BrandSettingsPanel } from '@/features/brand/components/brand-settings-panel';
import { platformBrandingApi } from '@/features/brand/api/branding-api';

export default function PlatformBrandPage() {
  return (
    <PageShell
      title="Platform brand"
      description="Laam colors and logos for localhost login and the platform dashboard."
    >
      <BrandSettingsPanel
        api={platformBrandingApi}
        managePermission="platform.manage"
        syncLiveBrand
      />
    </PageShell>
  );
}
