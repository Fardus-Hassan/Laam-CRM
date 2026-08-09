'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type {
  CreateTenantUserRequest,
  OrgTeam,
  Permission,
  PermissionPreset,
  TenantUser,
} from '@laam/types';
import { ROLE_LABELS } from '@laam/types';
import {
  Clock,
  Mail,
  Phone,
  Plus,
  Search,
  UserCog,
  Users,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { PermissionMatrix } from '@/features/rbac/components/permission-matrix';
import { InviteUserDialog } from '@/features/rbac/components/invite-user-dialog';
import { TeamsAdminPanel } from '@/features/rbac/components/teams-admin-panel';
import { rbacApi } from '@/features/rbac/api/rbac-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Can } from '@/components/auth/can';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary'> = {
  active: 'success',
  invited: 'warning',
  suspended: 'secondary',
};

function roleLabelForUser(user: TenantUser, roles: { id: string; name: string }[]) {
  if (user.customRoleId) {
    const custom = roles.find((role) => role.id === user.customRoleId);
    if (custom) {
      return custom.name;
    }
  }
  return ROLE_LABELS[user.systemRole] ?? user.systemRole;
}

export function TeamAdminShell() {
  const searchParams = useSearchParams();
  const focusMembers = searchParams.get('view') === 'team';

  const { organization, user: sessionUser, switchRole, canSwitchRole } = useAuth();
  const organizationId = organization?.id;

  const [users, setUsers] = React.useState<TenantUser[]>([]);
  const [teams, setTeams] = React.useState<OrgTeam[]>([]);
  const [roles, setRoles] = React.useState<Awaited<ReturnType<typeof rbacApi.listRoles>>>([]);
  const [presets, setPresets] = React.useState<PermissionPreset[]>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState('');
  const [teamFilter, setTeamFilter] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [extraGrants, setExtraGrants] = React.useState<Permission[]>([]);
  const [extraDenies, setExtraDenies] = React.useState<Permission[]>([]);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [bulkRoleId, setBulkRoleId] = React.useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [tab, setTab] = React.useState<'members' | 'teams'>(
    focusMembers ? 'members' : 'members',
  );

  const selected = users.find((user) => user.id === selectedId);

  const refresh = React.useCallback(async () => {
    if (!organizationId) return;
    const [nextUsers, nextRoles, nextTeams, nextPresets] = await Promise.all([
      rbacApi.listUsers(organizationId),
      rbacApi.listRoles(organizationId),
      rbacApi.listTeams(organizationId),
      rbacApi.listCustomPresets(organizationId),
    ]);
    setUsers(nextUsers);
    setRoles(nextRoles);
    setTeams(nextTeams);
    setPresets(nextPresets);
    setSelectedId((current) => {
      if (current && nextUsers.some((user) => user.id === current)) {
        return current;
      }
      return nextUsers[0]?.id ?? '';
    });
    setSelectedIds((current) => current.filter((id) => nextUsers.some((user) => user.id === id)));
  }, [organizationId]);

  function teamName(teamId?: string) {
    if (!teamId) return '—';
    return teams.find((t) => t.id === teamId)?.name ?? '—';
  }

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (selected) {
      setExtraGrants([...selected.permissionGrants]);
      setExtraDenies([...selected.permissionDenies]);
    }
  }, [selected]);

  React.useEffect(() => {
    if (focusMembers) {
      setTab('members');
    }
  }, [focusMembers]);

  const filtered = users.filter((user) => {
    if (teamFilter && user.teamId !== teamFilter) {
      return false;
    }
    if (roleFilter) {
      if (user.customRoleId === roleFilter) {
        // ok
      } else if (
        roleFilter.startsWith('system:') &&
        user.systemRole === roleFilter.slice('system:'.length) &&
        !user.customRoleId
      ) {
        // ok
      } else {
        return false;
      }
    }
    if (statusFilter && user.status !== statusFilter) {
      return false;
    }
    if (!search) {
      return true;
    }
    const query = search.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  const activeCount = users.filter((user) => user.status === 'active').length;
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((user) => selectedIds.includes(user.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((current) => current.filter((id) => !filtered.some((user) => user.id === id)));
      return;
    }
    setSelectedIds((current) => [
      ...new Set([...current, ...filtered.map((user) => user.id)]),
    ]);
  }

  function toggleSelect(userId: string) {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function handleSaveOverrides() {
    if (!organizationId || !selected) return;
    try {
      await rbacApi.updateUserAcl(organizationId, selected.id, {
        customRoleId: selected.customRoleId,
        permissionGrants: extraGrants,
        permissionDenies: extraDenies,
      });
      toast.success('Access overrides saved');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save overrides');
    }
  }

  async function handleInvite(input: CreateTenantUserRequest) {
    if (!organizationId) return;
    const created = await rbacApi.createUser(organizationId, input);
    await refresh();
    setSelectedId(created.id);
    toast.success(`Invited ${created.name}`);
  }

  async function handleResendInvite(userId: string) {
    if (!organizationId) return;
    try {
      const user = await rbacApi.resendInvite(organizationId, userId);
      toast.success(`Invite resent to ${user.email}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend invite');
    }
  }

  async function handleBulk(action: 'suspend' | 'activate' | 'delete' | 'set_role') {
    if (!organizationId || !selectedIds.length) {
      return;
    }
    if (action === 'set_role' && !bulkRoleId) {
      toast.error('Select a role to transfer');
      return;
    }
    try {
      const result = await rbacApi.bulkUsers(organizationId, {
        userIds: selectedIds,
        action,
        customRoleId: action === 'set_role' ? bulkRoleId : undefined,
      });
      toast.success(`Updated ${result.processed} user(s)`);
      setSelectedIds([]);
      setDeleteConfirmOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bulk action failed');
    }
  }

  if (!organizationId) {
    return <p className="text-sm text-muted-foreground">Organization not loaded.</p>;
  }

  return (
    <>
      <div className={ORDER_PAGE_GAP}>
        <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Invite any role, apply presets, override permissions, and manage users in bulk.{' '}
          <Link href="/dashboard/settings/roles" className="font-medium text-primary hover:underline">
            Manage roles
          </Link>
        </p>

        <CrmSummaryStrip
          items={[
            { id: 'total', label: 'Users', value: String(users.length) },
            { id: 'active', label: 'Active', value: String(activeCount) },
            { id: 'invited', label: 'Invited', value: String(users.filter((u) => u.status === 'invited').length) },
            { id: 'teams', label: 'Teams', value: String(teams.length) },
          ]}
          className="sm:grid-cols-2 lg:grid-cols-4"
        />

        <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
          <button
            type="button"
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium sm:flex-none',
              tab === 'members' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setTab('members')}
          >
            <Users className="size-3.5" />
            Users
          </button>
          <button
            type="button"
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium sm:flex-none',
              tab === 'teams' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setTab('teams')}
          >
            <UsersRound className="size-3.5" />
            Teams
          </button>
        </div>

        {tab === 'teams' ? (
          <TeamsAdminPanel
            organizationId={organizationId}
            users={users}
            teams={teams}
            onChanged={refresh}
          />
        ) : null}

        {tab === 'members' ? (
          <>
            <Card className={ORDER_CARD_CLASS}>
              <CardHeader
                className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between gap-3')}
              >
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <CardTitle className="text-sm">Users</CardTitle>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {selectedIds.length > 0 ? (
                    <>
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        value={bulkRoleId}
                        onChange={(event) => setBulkRoleId(event.target.value)}
                      >
                        <option value="">Change role…</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!bulkRoleId}
                        onClick={() => void handleBulk('set_role')}
                      >
                        Transfer role
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleBulk('suspend')}
                      >
                        Suspend
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleBulk('activate')}
                      >
                        Activate
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteConfirmOpen(true)}
                      >
                        Delete
                      </Button>
                    </>
                  ) : null}
                  <Can permission={['users.manage', 'users.invite']}>
                    <Button type="button" size="sm" onClick={() => setInviteOpen(true)}>
                      <Plus className="size-4" />
                      Invite user
                    </Button>
                  </Can>
                </div>
              </CardHeader>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
                <div className="flex flex-wrap gap-3">
                  <div className="relative min-w-[200px] max-w-sm flex-1">
                    <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                      placeholder="Search by name or email…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={teamFilter}
                    onChange={(event) => setTeamFilter(event.target.value)}
                  >
                    <option value="">All teams</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                  >
                    <option value="">All roles</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="invited">Invited</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invited by</TableHead>
                      <TableHead>Last seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((user) => (
                      <TableRow
                        key={user.id}
                        className={cn('cursor-pointer', selectedId === user.id && 'bg-primary/5')}
                        onClick={() => setSelectedId(user.id)}
                      >
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(user.id)}
                            onChange={() => toggleSelect(user.id)}
                            aria-label={`Select ${user.name}`}
                          />
                        </TableCell>
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
                            {roleLabelForUser(user, roles)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {teamName(user.teamId)}
                          {user.teamId &&
                          teams.find((t) => t.id === user.teamId)?.leaderUserId === user.id
                            ? ' (leader)'
                            : ''}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={STATUS_VARIANT[user.status ?? 'active']}
                            className="text-[10px]"
                          >
                            {user.status ?? 'active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.invitedBy?.name ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.lastSeenAt ? (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatDate(user.lastSeenAt)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                          No users match this filter.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {selected ? (
              <Card className={ORDER_CARD_CLASS}>
                <CardHeader
                  className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between')}
                >
                  <div className="flex items-center gap-2">
                    <UserCog className="size-4 text-primary" />
                    <CardTitle className="text-sm">Access — {selected.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.status === 'invited' ? (
                      <Can permission={['users.manage', 'users.invite']}>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleResendInvite(selected.id)}
                        >
                          <Mail className="size-4" />
                          Resend invite
                        </Button>
                      </Can>
                    ) : null}
                    <Can permission="users.manage">
                      <Button type="button" size="sm" onClick={() => void handleSaveOverrides()}>
                        Save overrides
                      </Button>
                    </Can>
                  </div>
                </CardHeader>
                <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-6')}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        value={selected.customRoleId ?? `system:${selected.systemRole}`}
                        onChange={(event) =>
                          setUsers((current) =>
                            current.map((user) =>
                              user.id === selected.id
                                ? {
                                    ...user,
                                    customRoleId: event.target.value || undefined,
                                    systemRole: event.target.value.startsWith('system:')
                                      ? (event.target.value.slice('system:'.length) as TenantUser['systemRole'])
                                      : user.systemRole,
                                  }
                                : user,
                            ),
                          )
                        }
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
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
          </>
        ) : null}
      </div>

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roles={roles}
        presets={presets}
        onSubmit={handleInvite}
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected users</DialogTitle>
            <DialogDescription>
              Only invited users who never logged in can be permanently deleted. Active users should
              be suspended instead. You cannot delete yourself ({sessionUser?.email}).
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              {selectedIds.length} user(s) selected.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleBulk('delete')}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
