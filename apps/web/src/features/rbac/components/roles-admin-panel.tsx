'use client';

import * as React from 'react';
import type { CustomRole, Permission } from '@laam/types';
import { DASHBOARD_TEMPLATE_LABELS } from '@laam/types';
import { Plus, Trash2 } from 'lucide-react';

import { PermissionMatrix } from '@/features/rbac/components/permission-matrix';
import { PERMISSION_PRESETS, rbacApi } from '@/features/rbac/api/rbac-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Can } from '@/components/auth/can';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export function RolesAdminPanel() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  const [roles, setRoles] = React.useState<CustomRole[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [draftName, setDraftName] = React.useState('');
  const [draftPermissions, setDraftPermissions] = React.useState<Permission[]>([]);
  const [presetId, setPresetId] = React.useState(PERMISSION_PRESETS[0]?.id ?? '');

  const selected = roles.find((role) => role.id === selectedId);

  const refresh = React.useCallback(async () => {
    if (!organizationId) {
      return;
    }

    const nextRoles = await rbacApi.listRoles(organizationId);
    setRoles(nextRoles);
    setSelectedId((current) => current ?? nextRoles[0]?.id ?? null);
  }, [organizationId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (selected) {
      setDraftName(selected.name);
      setDraftPermissions([...selected.permissions]);
    }
  }, [selected]);

  const handleCreate = async () => {
    if (!organizationId) {
      return;
    }

    const preset = PERMISSION_PRESETS.find((item) => item.id === presetId);
    const created = await rbacApi.createRole(organizationId, {
      name: `New Role ${roles.length + 1}`,
      presetId,
      permissions: preset ? [...preset.permissions] : [],
    });

    await refresh();
    setSelectedId(created.id);
  };

  const handleSave = async () => {
    if (!organizationId || !selected) {
      return;
    }

    await rbacApi.updateRole(organizationId, selected.id, {
      name: draftName,
      permissions: draftPermissions,
    });
    await refresh();
  };

  const handleDelete = async () => {
    if (!organizationId || !selected || selected.isSystem) {
      return;
    }

    await rbacApi.deleteRole(organizationId, selected.id);
    await refresh();
    setSelectedId(null);
  };

  if (!organizationId) {
    return <p className="text-sm text-muted-foreground">Organization not loaded.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-sm">Roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3">
          <ul className="space-y-1">
            {roles.map((role) => (
              <li key={role.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(role.id)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedId === role.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="truncate">{role.name}</span>
                  {role.isSystem ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Preset
                    </Badge>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>

          <Can permission="roles.manage">
            <div className="space-y-2 border-t border-border/70 pt-3">
              <Label className="text-xs">Start from preset</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={presetId}
                onChange={(event) => setPresetId(event.target.value)}
              >
                {PERMISSION_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <Button type="button" size="sm" className="w-full" onClick={() => void handleCreate()}>
                <Plus className="size-4" />
                New Role
              </Button>
            </div>
          </Can>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <CardTitle className="text-sm">Edit Role</CardTitle>
            {selected?.dashboardTemplate ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Dashboard: {DASHBOARD_TEMPLATE_LABELS[selected.dashboardTemplate]}
              </p>
            ) : null}
          </div>
          <Can permission="roles.manage">
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => void handleSave()} disabled={!selected}>
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleDelete()}
                disabled={!selected || selected.isSystem}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </Can>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {selected ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="role-name">Role name</Label>
                <Input
                  id="role-name"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  disabled={selected.isSystem}
                />
              </div>
              <PermissionMatrix
                value={draftPermissions}
                onChange={setDraftPermissions}
                disabled={selected.isSystem}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a role to edit permissions.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
