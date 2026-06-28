'use client';

import * as React from 'react';
import type { Tenant } from '@laam/types';
import { Building2, Plus } from 'lucide-react';

import { OnboardTenantWizard } from '@/features/platform/components/onboard-tenant-wizard';
import { tenantApi } from '@/features/platform/api/tenant-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Can } from '@/components/auth/can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type PlatformTenantsPanelProps = {
  initialTab?: string;
};

export function PlatformTenantsPanel({ initialTab }: PlatformTenantsPanelProps) {
  const { previewAsTenantOwner, canSwitchRole } = useAuth();
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [wizardOpen, setWizardOpen] = React.useState(initialTab === 'onboarding');
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [ownerEmails, setOwnerEmails] = React.useState<Record<string, string>>({});

  const refresh = React.useCallback(async () => {
    const nextTenants = await tenantApi.listTenants();
    setTenants(nextTenants);

    const emails: Record<string, string> = {};
    await Promise.all(
      nextTenants.map(async (tenant) => {
        const owner = await tenantApi.getTenantOwner(tenant.id);
        if (owner) {
          emails[tenant.id] = owner.email;
        }
      }),
    );
    setOwnerEmails(emails);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async (
    input: Parameters<typeof tenantApi.createTenant>[0],
  ) => {
    const tenant = await tenantApi.createTenant(input);
    const owner = await tenantApi.getTenantOwner(tenant.id);

    setSuccessMessage(
      `${tenant.name} created. Owner: ${owner?.email ?? input.owner.email} (Org Admin)`,
    );
    await refresh();
  };

  return (
    <div className="space-y-4">
      {successMessage ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          {successMessage}
        </div>
      ) : null}

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <CardTitle className="text-sm">Tenants</CardTitle>
          </div>
          <Can permission="platform.manage">
            <Button type="button" size="sm" onClick={() => setWizardOpen(true)}>
              <Plus className="size-4" />
              Onboard Company
            </Button>
          </Can>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>{tenant.plan}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {ownerEmails[tenant.id] ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.status === 'active' ? 'success' : 'secondary'}>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canSwitchRole ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void previewAsTenantOwner(tenant.id)}
                      >
                        Preview as Owner
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <OnboardTenantWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}
