'use client';

import * as React from 'react';
import type { TenantListItem, TenantStatus } from '@laam/types';
import { Building2, ExternalLink, MoreHorizontal, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { OnboardTenantWizard } from '@/features/platform/components/onboard-tenant-wizard';
import { tenantApi } from '@/features/platform/api/tenant-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Can } from '@/components/auth/can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { tenantDashboardUrl, tenantLoginUrl } from '@/lib/tenant';

type PlatformTenantsPanelProps = {
  initialTab?: string;
};

export function PlatformTenantsPanel({ initialTab }: PlatformTenantsPanelProps) {
  const { previewAsTenantOwner, canSwitchRole } = useAuth();
  const [tenants, setTenants] = React.useState<TenantListItem[]>([]);
  const [wizardOpen, setWizardOpen] = React.useState(initialTab === 'onboarding');
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [busyTenantId, setBusyTenantId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<TenantListItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState('');

  const refresh = React.useCallback(async () => {
    const nextTenants = await tenantApi.listTenants();
    setTenants(nextTenants);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async (
    input: Parameters<typeof tenantApi.createTenant>[0],
  ) => {
    const result = await tenantApi.createTenant(input);

    if (result.emailSent === false) {
      toast.warning(
        result.emailWarning?.includes('Authentication failed')
          ? 'Company created, but invite email failed — check Brevo SMTP key in .env'
          : `Company created, but invite email failed: ${result.emailWarning ?? 'unknown error'}`,
      );
      setSuccessMessage(
        `${result.tenant.name} created. Invite email not sent — share login manually: ${result.loginUrl ?? ''} / temp password in API log`,
      );
    } else {
      setSuccessMessage(
        `${result.tenant.name} created. Owner: ${result.ownerEmail ?? input.owner.email} (Org Admin) — invite email sent`,
      );
    }

    await refresh();
  };

  const handleStatusChange = async (tenant: TenantListItem, status: TenantStatus) => {
    setBusyTenantId(tenant.id);
    try {
      await tenantApi.updateTenantStatus(tenant.id, status);
      toast.success(`${tenant.name} is now ${status}`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update tenant status');
    } finally {
      setBusyTenantId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirm !== 'delete') {
      return;
    }

    setBusyTenantId(deleteTarget.id);
    try {
      await tenantApi.deleteTenant(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      setDeleteConfirm('');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete tenant');
    } finally {
      setBusyTenantId(null);
    }
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
              {tenants.map((tenant) => {
                const owner = tenant.owner;
                const isBusy = busyTenantId === tenant.id;

                return (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>{tenant.plan}</TableCell>
                    <TableCell>
                      {owner ? (
                        <div className="text-sm">
                          <p className="font-medium">{owner.name}</p>
                          <p className="text-xs text-muted-foreground">{owner.email}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.status === 'active' ? 'success' : 'secondary'}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" asChild>
                          <a
                            href={tenantLoginUrl(tenant.slug)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="size-3.5" />
                            Open CRM
                          </a>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              aria-label={`Actions for ${tenant.name}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <a
                                href={tenantDashboardUrl(tenant.slug)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open dashboard
                              </a>
                            </DropdownMenuItem>
                            {tenant.status === 'active' ? (
                              <DropdownMenuItem
                                onClick={() => void handleStatusChange(tenant, 'suspended')}
                              >
                                Suspend tenant
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => void handleStatusChange(tenant, 'active')}
                              >
                                Activate tenant
                              </DropdownMenuItem>
                            )}
                            {canSwitchRole ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => void previewAsTenantOwner(tenant.id)}
                                >
                                  Preview as owner
                                </DropdownMenuItem>
                              </>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setDeleteTarget(tenant);
                                setDeleteConfirm('');
                              }}
                            >
                              Delete tenant
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <OnboardTenantWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSubmit={handleCreate}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirm('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tenant</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" (${deleteTarget.slug}) and all its users will be permanently deleted.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Type <strong>delete</strong> to confirm.
            </p>
            <Input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder="delete"
              autoComplete="off"
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirm('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteConfirm !== 'delete' || busyTenantId === deleteTarget?.id}
              onClick={() => void handleDelete()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
