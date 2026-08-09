'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { BrandSettingsPanel } from '@/features/brand/components/brand-settings-panel';
import { tenantBrandingApi } from '@/features/brand/api/branding-api';
import { tenantApi } from '@/features/platform/api/tenant-api';

export default function PlatformTenantBrandPage() {
  const params = useParams();
  const tenantId = typeof params.id === 'string' ? params.id : '';
  const [tenantName, setTenantName] = React.useState<string>('Tenant');
  const api = React.useMemo(
    () => (tenantId ? tenantBrandingApi(tenantId) : null),
    [tenantId],
  );

  React.useEffect(() => {
    if (!tenantId) {
      return;
    }
    void tenantApi.getTenant(tenantId).then((tenant) => {
      if (tenant) {
        setTenantName(tenant.name);
      }
    });
  }, [tenantId]);

  if (!tenantId || !api) {
    return (
      <PageShell title="Tenant brand" description="Missing tenant id.">
        <Button type="button" variant="outline" asChild>
          <Link href="/dashboard/platform?tab=tenants">Back to tenants</Link>
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`${tenantName} brand`}
      description="Override this company’s colors and logos (login + CRM)."
    >
      <div className="mb-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/dashboard/platform?tab=tenants">
            <ArrowLeft className="size-3.5" />
            Tenants
          </Link>
        </Button>
      </div>
      <BrandSettingsPanel
        api={api}
        managePermission="platform.manage"
        syncLiveBrand={false}
      />
    </PageShell>
  );
}
