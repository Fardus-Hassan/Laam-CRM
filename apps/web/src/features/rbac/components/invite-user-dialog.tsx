'use client';

import * as React from 'react';
import type { CreateTenantUserRequest, CustomRole, Permission, PermissionPreset } from '@laam/types';
import Link from 'next/link';

import { PermissionMatrix } from '@/features/rbac/components/permission-matrix';
import { PERMISSION_PRESETS } from '@/features/rbac/api/rbac-api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type InviteUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: CustomRole[];
  presets?: PermissionPreset[];
  onSubmit: (input: CreateTenantUserRequest) => Promise<void>;
};

export function InviteUserDialog({
  open,
  onOpenChange,
  roles,
  presets = [],
  onSubmit,
}: InviteUserDialogProps) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [customRoleId, setCustomRoleId] = React.useState('');
  const [presetId, setPresetId] = React.useState('');
  const [extraOpen, setExtraOpen] = React.useState(false);
  const [permissionGrants, setPermissionGrants] = React.useState<Permission[]>([]);
  const [permissionDenies, setPermissionDenies] = React.useState<Permission[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const allPresets = React.useMemo(
    () => [...PERMISSION_PRESETS, ...presets.filter((p) => !PERMISSION_PRESETS.some((b) => b.id === p.id))],
    [presets],
  );

  const selectedRole = roles.find((role) => role.id === customRoleId);
  const rolePermissions = selectedRole?.permissions ?? [];

  React.useEffect(() => {
    if (!open) {
      setName('');
      setEmail('');
      setCustomRoleId(roles[0]?.id ?? '');
      setPresetId('');
      setExtraOpen(false);
      setPermissionGrants([]);
      setPermissionDenies([]);
      setIsSubmitting(false);
    } else if (!customRoleId && roles[0]) {
      setCustomRoleId(roles[0].id);
    }
  }, [open, roles, customRoleId]);

  const canSubmit =
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    customRoleId.length > 0;

  const handlePresetChange = (nextPresetId: string) => {
    setPresetId(nextPresetId);
    if (!nextPresetId) {
      return;
    }
    const preset = allPresets.find((item) => item.id === nextPresetId);
    if (!preset) {
      return;
    }
    setPermissionGrants([...preset.permissions]);
    setExtraOpen(true);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        systemRole: (customRoleId.startsWith('system:')
          ? customRoleId.slice('system:'.length)
          : 'sales_rep') as CreateTenantUserRequest['systemRole'],
        customRoleId,
        permissionGrants,
        permissionDenies,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
          <DialogDescription>
            Assign a role, optionally apply a permission preset, then add extra access if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nadia Islam"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nadia@company.com"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="invite-role">Role</Label>
              <Link
                href="/dashboard/settings/roles"
                className="text-xs text-primary hover:underline"
              >
                Create new role
              </Link>
            </div>
            <select
              id="invite-role"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={customRoleId}
              onChange={(event) => setCustomRoleId(event.target.value)}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-preset">Apply preset (optional)</Label>
            <select
              id="invite-preset"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={presetId}
              onChange={(event) => handlePresetChange(event.target.value)}
            >
              <option value="">None</option>
              {allPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Preset permissions are added as extra grants on top of the selected role.
            </p>
          </div>

          <Collapsible open={extraOpen} onOpenChange={setExtraOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="px-0">
                {extraOpen ? 'Hide extra access' : 'Extra access (optional)'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div>
                <p className="mb-2 text-xs font-medium">
                  Role permissions — {selectedRole?.name ?? 'selected role'} (read-only)
                </p>
                {rolePermissions.length ? (
                  <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-2">
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {rolePermissions.map((permission) => (
                        <li key={permission} className="font-mono">
                          {permission}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No permissions on this role.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium">Extra grants</p>
                <PermissionMatrix value={permissionGrants} onChange={setPermissionGrants} />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium">Explicit denies</p>
                <PermissionMatrix value={permissionDenies} onChange={setPermissionDenies} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit || isSubmitting} onClick={() => void handleSubmit()}>
            {isSubmitting ? 'Saving…' : 'Invite user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
