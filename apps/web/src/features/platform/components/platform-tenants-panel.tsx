'use client';

import * as React from 'react';
import Link from 'next/link';
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
  const [addAdminTarget, setAddAdminTarget] = React.useState<TenantListItem | null>(null);
  const [adminName, setAdminName] = React.useState('');
  const [adminEmail, setAdminEmail] = React.useState('');

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
    const extraCount = input.additionalAdmins?.length ?? 0;

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
        `${result.tenant.name} created. Primary admin: ${result.ownerEmail ?? input.owner.email}${
          extraCount ? ` (+${extraCount} more admin${extraCount === 1 ? '' : 's'})` : ''
        } — invite email(s) sent`,
      );
    }

    await refresh();
  };

  const handleAddAdmin = async () => {
    if (!addAdminTarget) {
      return;
    }
    if (!adminName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
      toast.error('Enter a valid admin name and email');
      return;
    }

    setBusyTenantId(addAdminTarget.id);
    try {
      const result = await tenantApi.addAdmin(addAdminTarget.id, {
        name: adminName.trim(),
        email: adminEmail.trim(),
      });
      if (result.emailSent === false) {
        toast.warning(result.emailWarning ?? 'Admin created but invite email failed');
      } else {
        toast.success(`Admin ${result.email} invited`);
      }
      setAddAdminTarget(null);
      setAdminName('');
      setAdminEmail('');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add admin');
    } finally {
      setBusyTenantId(null);
    }
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
                <TableHead>Phone</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Admins</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => {
                const admins = tenant.admins?.length
                  ? tenant.admins
                  : tenant.owner
                    ? [tenant.owner]
                    : [];
                const isBusy = busyTenantId === tenant.id;

                return (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tenant.phone || '—'}
                    </TableCell>
                    <TableCell>{tenant.plan}</TableCell>
                    <TableCell>
                      {admins.length ? (
                        <div className="space-y-1 text-sm">
                          {admins.map((admin) => (
                            <div key={admin.id}>
                              <p className="font-medium">{admin.name}</p>
                              <p className="text-xs text-muted-foreground">{admin.email}</p>
                            </div>
                          ))}
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
                            <Can permission="platform.manage">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/platform/tenants/${tenant.id}/brand`}>
                                  Edit brand
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setAddAdminTarget(tenant);
                                  setAdminName('');
                                  setAdminEmail('');
                                }}
                              >
                                Add admin
                              </DropdownMenuItem>
                            </Can>
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
        open={addAdminTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddAdminTarget(null);
            setAdminName('');
            setAdminEmail('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add org admin</DialogTitle>
            <DialogDescription>
              {addAdminTarget
                ? `Invite another Org Admin for ${addAdminTarget.name}.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <Input
              value={adminName}
              onChange={(event) => setAdminName(event.target.value)}
              placeholder="Full name"
            />
            <Input
              type="email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              placeholder="email@company.com"
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddAdminTarget(null);
                setAdminName('');
                setAdminEmail('');
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleAddAdmin()}>
              Invite admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
