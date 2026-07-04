'use client';

import * as React from 'react';
import type { CreateTenantUserRequest, CustomRole, Permission } from '@laam/types';
import Link from 'next/link';

import { PermissionMatrix } from '@/features/rbac/components/permission-matrix';
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
  onSubmit: (input: CreateTenantUserRequest) => Promise<void>;
};

export function InviteUserDialog({
  open,
  onOpenChange,
  roles,
  onSubmit,
}: InviteUserDialogProps) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [customRoleId, setCustomRoleId] = React.useState('');
  const [extraOpen, setExtraOpen] = React.useState(false);
  const [permissionGrants, setPermissionGrants] = React.useState<Permission[]>([]);
  const [permissionDenies, setPermissionDenies] = React.useState<Permission[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setName('');
      setEmail('');
      setCustomRoleId(roles[0]?.id ?? '');
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

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        systemRole: 'sales_rep',
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
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Add a team member and assign a role. You can grant extra permissions below the role.
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

          <Collapsible open={extraOpen} onOpenChange={setExtraOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="px-0">
                {extraOpen ? 'Hide extra access' : 'Extra access (optional)'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
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
            {isSubmitting ? 'Saving…' : 'Invite User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
