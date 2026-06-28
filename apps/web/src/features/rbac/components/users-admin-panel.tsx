'use client';

import * as React from 'react';
import type { CreateTenantUserRequest, Permission, TenantUser } from '@laam/types';
import { ROLE_LABELS } from '@laam/types';
import { Plus } from 'lucide-react';

import { PermissionMatrix } from '@/features/rbac/components/permission-matrix';
import { InviteUserDialog } from '@/features/rbac/components/invite-user-dialog';
import { rbacApi } from '@/features/rbac/api/rbac-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Can } from '@/components/auth/can';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export function UsersAdminPanel() {
  const { organization, switchRole, canSwitchRole } = useAuth();
  const organizationId = organization?.id;

  const [users, setUsers] = React.useState<TenantUser[]>([]);
  const [roles, setRoles] = React.useState<Awaited<ReturnType<typeof rbacApi.listRoles>>>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [extraGrants, setExtraGrants] = React.useState<Permission[]>([]);
  const [extraDenies, setExtraDenies] = React.useState<Permission[]>([]);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const selected = users.find((user) => user.id === selectedId);

  const refresh = React.useCallback(async () => {
    if (!organizationId) {
      return;
    }

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

  const handleSaveOverrides = async () => {
    if (!organizationId || !selected) {
      return;
    }

    await rbacApi.updateUserAcl(organizationId, selected.id, {
      customRoleId: selected.customRoleId,
      permissionGrants: extraGrants,
      permissionDenies: extraDenies,
    });
    await refresh();
  };

  const handleInvite = async (input: CreateTenantUserRequest) => {
    if (!organizationId) {
      return;
    }

    const created = await rbacApi.createUser(organizationId, input);
    await refresh();
    setSelectedId(created.id);
  };

  if (!organizationId) {
    return <p className="text-sm text-muted-foreground">Organization not loaded.</p>;
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
            <CardTitle className="text-sm">Team Members</CardTitle>
            <Can permission="users.manage">
              <Button type="button" size="sm" onClick={() => setInviteOpen(true)}>
                <Plus className="size-4" />
                Invite
              </Button>
            </Can>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedId(user.id)}
                className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                  selectedId === user.id ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {ROLE_LABELS[user.systemRole]}
                  </Badge>
                  {user.permissionGrants.length ? (
                    <Badge variant="success" className="text-[10px]">
                      +{user.permissionGrants.length} grants
                    </Badge>
                  ) : null}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
            <CardTitle className="text-sm">User Access</CardTitle>
            <Can permission="users.manage">
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSaveOverrides()}
                disabled={!selected}
              >
                Save overrides
              </Button>
            </Can>
          </CardHeader>
          <CardContent className="space-y-6 p-4">
            {selected ? (
              <>
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
                  <p className="mb-3 text-xs text-muted-foreground">
                    Permissions added on top of the assigned role.
                  </p>
                  <PermissionMatrix value={extraGrants} onChange={setExtraGrants} />
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Explicit denies</h3>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Denies win over role and grants.
                  </p>
                  <PermissionMatrix value={extraDenies} onChange={setExtraDenies} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a team member.</p>
            )}
          </CardContent>
        </Card>
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
