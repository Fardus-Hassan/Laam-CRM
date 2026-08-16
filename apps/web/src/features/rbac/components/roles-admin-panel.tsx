'use client';

import * as React from 'react';
import type { CustomRole, Permission, PermissionPreset } from '@laam/types';
import { DASHBOARD_TEMPLATE_LABELS } from '@laam/types';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { FormSearchSelect } from '@/components/form/form-search-select';
import { PermissionMatrix } from '@/features/rbac/components/permission-matrix';
import { rbacApi } from '@/features/rbac/api/rbac-api';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { Can } from '@/components/auth/can';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormTextarea } from '@/components/form/form-textarea';

function resolvePresetPermissions(preset: PermissionPreset): Permission[] {
  return [...preset.permissions];
}

export function RolesAdminPanel() {
  const { organization } = useAuth();
  const { can } = usePermissions();
  const organizationId = organization?.id;
  const canManage = can('roles.manage');

  const [roles, setRoles] = React.useState<CustomRole[]>([]);
  const [customPresets, setCustomPresets] = React.useState<PermissionPreset[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [draftName, setDraftName] = React.useState('');
  const [draftDescription, setDraftDescription] = React.useState('');
  const [draftPermissions, setDraftPermissions] = React.useState<Permission[]>([]);
  const [createName, setCreateName] = React.useState('');
  const [createPresetId, setCreatePresetId] = React.useState('');
  const [applyPresetId, setApplyPresetId] = React.useState('');
  const [savePresetName, setSavePresetName] = React.useState('');

  const savedPresets = customPresets;

  const selected = roles.find((role) => role.id === selectedId);
  const selectedPreset = savedPresets.find((preset) => preset.id === createPresetId);

  const refresh = React.useCallback(async () => {
    if (!organizationId) {
      return;
    }

    const [nextRoles, nextCustomPresets] = await Promise.all([
      rbacApi.listRoles(organizationId),
      rbacApi.listCustomPresets(organizationId),
    ]);
    setRoles(nextRoles.filter((role) => !role.isSystem));
    setCustomPresets(nextCustomPresets);
    setSelectedId((current) => current ?? nextRoles[0]?.id ?? null);
  }, [organizationId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (selected) {
      setDraftName(selected.name);
      setDraftDescription(selected.description ?? '');
      setDraftPermissions([...selected.permissions]);
      setSavePresetName(`${selected.name} preset`);
    }
  }, [selected]);

  React.useEffect(() => {
    if (!savedPresets.some((preset) => preset.id === createPresetId)) {
      setCreatePresetId('');
    }
    if (!savedPresets.some((preset) => preset.id === applyPresetId)) {
      setApplyPresetId('');
    }
  }, [savedPresets, applyPresetId, createPresetId]);

  const handleCreate = async () => {
    if (!organizationId || !canManage) {
      return;
    }

    const name = createName.trim() || `Custom role ${roles.filter((r) => !r.isSystem).length + 1}`;
    const preset = savedPresets.find((item) => item.id === createPresetId);

    const created = await rbacApi.createRole(organizationId, {
      name,
      description: preset?.description,
      permissions: preset ? resolvePresetPermissions(preset) : [],
    });

    await refresh();
    setSelectedId(created.id);
    setCreateName('');
    toast.success(`Role "${created.name}" created`);
  };

  const handleSave = async () => {
    if (!organizationId || !selected || !canManage) {
      return;
    }

    if (selected.isSystem) {
      toast.error('System preset roles cannot be edited. Duplicate as custom role instead.');
      return;
    }

    await rbacApi.updateRole(organizationId, selected.id, {
      name: draftName.trim() || selected.name,
      description: draftDescription.trim() || undefined,
      permissions: draftPermissions,
    });
    await refresh();
    toast.success('Role saved');
  };

  const handleDelete = async () => {
    if (!organizationId || !selected || selected.isSystem || !canManage) {
      return;
    }

    await rbacApi.deleteRole(organizationId, selected.id);
    await refresh();
    setSelectedId(null);
    toast.success('Role deleted');
  };

  const handleDuplicate = async () => {
    if (!organizationId || !selected || !canManage) {
      return;
    }

    const created = await rbacApi.createRole(organizationId, {
      name: `${selected.name} (copy)`,
      description: selected.description,
      permissions: [...selected.permissions],
      dashboardTemplate: selected.dashboardTemplate,
    });
    await refresh();
    setSelectedId(created.id);
    toast.success('Custom role duplicated');
  };

  const handleApplyPreset = () => {
    const preset = savedPresets.find((item) => item.id === applyPresetId);
    if (!preset) {
      return;
    }

    setDraftPermissions(resolvePresetPermissions(preset));
    if (!draftDescription.trim() && preset.description) {
      setDraftDescription(preset.description);
    }
    toast.message(`Applied preset: ${preset.name}`);
  };

  const handleSaveAsPreset = async () => {
    if (!organizationId || !canManage) {
      return;
    }

    const name = savePresetName.trim();
    if (!name) {
      toast.error('Enter a preset name');
      return;
    }

    await rbacApi.saveCustomPreset(organizationId, {
      name,
      description: draftDescription.trim() || selected?.description,
      permissions: draftPermissions,
    });
    await refresh();
    toast.success(`Preset "${name}" saved`);
  };

  const handleDeleteCustomPreset = async (presetId: string) => {
    if (!organizationId || !canManage) {
      return;
    }

    try {
      const deleted = await rbacApi.deleteCustomPreset(organizationId, presetId);
      if (!deleted) {
        toast.error('Could not delete this preset');
        return;
      }
      await refresh();
      toast.success('Preset removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete this preset');
    }
  };

  if (!organizationId) {
    return <p className="text-sm text-muted-foreground">Organization not loaded.</p>;
  }

  return (
    <div className="space-y-4">
      {!canManage ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          View-only mode. Switch to <strong>Org Admin</strong> (user menu → demo role) to create
          custom roles and save permission presets.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3">
            <ul className="max-h-[320px] space-y-1 overflow-y-auto custom-scrollbar">
              {roles.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No roles yet. Create a name and pick permissions — nothing is preloaded for a new company.
                </li>
              ) : null}
              {roles.map((role) => (
                <li key={role.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(role.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === role.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="truncate">{role.name}</span>
                  </button>
                </li>
              ))}
            </ul>

            <Can permission="roles.manage">
              <div className="space-y-2 border-t border-border/70 pt-3">
                <Label htmlFor="create-role-name" className="text-xs">
                  New custom role
                </Label>
                <Input
                  id="create-role-name"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder="e.g. Call center lead"
                />
                <Label className="text-xs">Start from saved preset (optional)</Label>
                <FormSearchSelect
                  value={createPresetId}
                  onChange={setCreatePresetId}
                  placeholder="Blank permissions"
                  searchPlaceholder="Search presets…"
                  emptyMessage="No saved presets yet"
                  options={[
                    { value: '', label: 'Blank permissions' },
                    ...savedPresets.map((preset) => ({
                      value: preset.id,
                      label: preset.name,
                    })),
                  ]}
                />
                {selectedPreset?.description ? (
                  <p className="text-xs text-muted-foreground">{selectedPreset.description}</p>
                ) : null}
                <Button type="button" size="sm" className="w-full" onClick={() => void handleCreate()}>
                  <Plus className="size-4" />
                  Create role
                </Button>
              </div>
            </Can>

            {customPresets.length > 0 ? (
              <div className="space-y-2 border-t border-border/70 pt-3">
                <Label className="text-xs">Saved presets</Label>
                <ul className="space-y-1">
                  {customPresets.map((preset) => (
                    <li
                      key={preset.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5 text-xs"
                    >
                      <span className="truncate">{preset.name}</span>
                      <Can permission="roles.manage">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => void handleDeleteCustomPreset(preset.id)}
                          aria-label={`Delete preset ${preset.name}`}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </Can>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <CardTitle className="text-sm">Permissions</CardTitle>
              {selected?.dashboardTemplate ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Dashboard: {DASHBOARD_TEMPLATE_LABELS[selected.dashboardTemplate]}
                </p>
              ) : null}
            </div>
            <Can permission="roles.manage">
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleDuplicate()}
                  disabled={!selected}
                >
                  <Copy className="size-4" />
                  Duplicate
                </Button>
                <Button type="button" size="sm" onClick={() => void handleSave()} disabled={!selected}>
                  Save role
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">Role name</Label>
                    <Input
                      id="role-name"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      disabled={selected.isSystem || !canManage}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="role-description">Description</Label>
                    <FormTextarea
                      id="role-description"
                      rows={2}
                      value={draftDescription}
                      onChange={(event) => setDraftDescription(event.target.value)}
                      disabled={selected.isSystem || !canManage}
                      placeholder="What this role is for…"
                    />
                  </div>
                </div>

                {selected.isSystem ? (
                  <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    System roles mirror built-in presets. Use <strong>Duplicate</strong> to create
                    an editable custom copy.
                  </p>
                ) : null}

                <Can permission="roles.manage">
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <p className="mb-3 text-xs font-medium text-muted-foreground">
                      Permission presets
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="min-w-0 space-y-2">
                        <Label className="text-xs">Apply preset to this role</Label>
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <FormSearchSelect
                              value={applyPresetId}
                              onChange={setApplyPresetId}
                              placeholder="Select saved preset…"
                              searchPlaceholder="Search presets…"
                              emptyMessage="No saved presets yet"
                              options={savedPresets.map((preset) => ({
                                value: preset.id,
                                label: preset.name,
                              }))}
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="shrink-0"
                            onClick={handleApplyPreset}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                      <div className="min-w-0 space-y-2">
                        <Label className="text-xs">Save current permissions as preset</Label>
                        <div className="flex min-w-0 items-center gap-2">
                          <Input
                            value={savePresetName}
                            onChange={(event) => setSavePresetName(event.target.value)}
                            placeholder="Preset name"
                            className="h-8 min-w-0 flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="shrink-0"
                            onClick={() => void handleSaveAsPreset()}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Can>

                <PermissionMatrix
                  value={draftPermissions}
                  onChange={setDraftPermissions}
                  disabled={selected.isSystem || !canManage}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a role to view or edit permissions.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
