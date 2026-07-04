'use client';

import * as React from 'react';
import type { CreateTenantUserRequest, Permission, TenantUser } from '@laam/types';
import { ROLE_LABELS } from '@laam/types';
import { Clock, Mail, Phone, Plus, Search, UserCog, Users } from 'lucide-react';

import { PermissionMatrix } from '@/features/rbac/components/permission-matrix';
import { InviteUserDialog } from '@/features/rbac/components/invite-user-dialog';
import { rbacApi } from '@/features/rbac/api/rbac-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Can } from '@/components/auth/can';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary'> = {
  active: 'success',
  invited: 'warning',
  suspended: 'secondary',
};

export function TeamAdminShell() {
  const { organization, switchRole, canSwitchRole } = useAuth();
  const organizationId = organization?.id;

  const [users, setUsers] = React.useState<TenantUser[]>([]);
  const [roles, setRoles] = React.useState<Awaited<ReturnType<typeof rbacApi.listRoles>>>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [extraGrants, setExtraGrants] = React.useState<Permission[]>([]);
  const [extraDenies, setExtraDenies] = React.useState<Permission[]>([]);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const selected = users.find((user) => user.id === selectedId);

  const refresh = React.useCallback(async () => {
    if (!organizationId) return;
    const [nextUsers, nextRoles] = await Promise.all([
      rbacApi.listUsers(organizationId),
      rbacApi.listRoles(organizationId),
    ]);
    setUsers(nextUsers);
    setRoles(nextRoles);
    setSelectedId((current) => current || nextUsers[0]?.id || '');
  }, [organizationId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (selected) {
      setExtraGrants([...selected.permissionGrants]);
      setExtraDenies([...selected.permissionDenies]);
    }
  }, [selected]);

  const filtered = users.filter(
    (u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = users.filter((u) => u.status === 'active').length;
  const invitedCount = users.filter((u) => u.status === 'invited').length;

  async function handleSaveOverrides() {
    if (!organizationId || !selected) return;
    await rbacApi.updateUserAcl(organizationId, selected.id, {
      customRoleId: selected.customRoleId,
      permissionGrants: extraGrants,
      permissionDenies: extraDenies,
    });
    await refresh();
  }

  async function handleInvite(input: CreateTenantUserRequest) {
    if (!organizationId) return;
    const created = await rbacApi.createUser(organizationId, input);
    await refresh();
    setSelectedId(created.id);
  }

  if (!organizationId) {
    return <p className="text-sm text-muted-foreground">Organization not loaded.</p>;
  }

  return (
    <>
      <div className={ORDER_PAGE_GAP}>
        <CrmSummaryStrip
          items={[
            { id: 'total', label: 'Team members', value: String(users.length) },
            { id: 'active', label: 'Active', value: String(activeCount) },
            { id: 'invited', label: 'Invited', value: String(invitedCount) },
            { id: 'roles', label: 'Custom roles', value: String(roles.length) },
          ]}
          className="sm:grid-cols-2 lg:grid-cols-4"
        />

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between')}>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <CardTitle className="text-sm">Team members</CardTitle>
            </div>
            <Can permission="users.manage">
              <Button type="button" size="sm" onClick={() => setInviteOpen(true)}>
                <Plus className="size-4" />
                Invite
              </Button>
            </Can>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead>Distribution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow
                    key={user.id}
                    className={cn('cursor-pointer', selectedId === user.id && 'bg-primary/5')}
                    onClick={() => setSelectedId(user.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="size-3" />
                          {user.email}
                        </p>
                        {user.phone ? (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="size-3" />
                            {user.phone}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {ROLE_LABELS[user.systemRole]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[user.status ?? 'active']} className="text-[10px]">
                        {user.status ?? 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastSeenAt ? (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(user.lastSeenAt).toLocaleDateString()}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.orderDistributionPercent != null ? `${user.orderDistributionPercent}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selected ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between')}>
              <div className="flex items-center gap-2">
                <UserCog className="size-4 text-primary" />
                <CardTitle className="text-sm">Access — {selected.name}</CardTitle>
              </div>
              <Can permission="users.manage">
                <Button type="button" size="sm" onClick={() => void handleSaveOverrides()}>
                  Save overrides
                </Button>
              </Can>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-6')}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Custom role</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={selected.customRoleId ?? ''}
                    onChange={(event) =>
                      setUsers((current) =>
                        current.map((user) =>
                          user.id === selected.id
                            ? { ...user, customRoleId: event.target.value || undefined }
                            : user,
                        ),
                      )
                    }
                  >
                    <option value="">System role only</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
                {canSwitchRole ? (
                  <div className="space-y-2">
                    <Label>Demo: preview as role</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => void switchRole(selected.systemRole)}
                    >
                      Switch to {ROLE_LABELS[selected.systemRole]}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Extra grants</h3>
                <PermissionMatrix value={extraGrants} onChange={setExtraGrants} />
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Explicit denies</h3>
                <PermissionMatrix value={extraDenies} onChange={setExtraDenies} />
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roles={roles}
        onSubmit={handleInvite}
      />
    </>
  );
}
