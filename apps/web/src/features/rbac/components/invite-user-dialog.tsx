'use client';

import * as React from 'react';
import type { CreateTenantUserRequest, CustomRole } from '@laam/types';
import Link from 'next/link';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
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
  const customRoles = React.useMemo(
    () => roles.filter((role) => !role.isSystem),
    [roles],
  );

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [customRoleId, setCustomRoleId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setName('');
      setEmail('');
      setCustomRoleId(customRoles[0]?.id ?? '');
      setIsSubmitting(false);
      return;
    }
    if (!customRoleId && customRoles[0]) {
      setCustomRoleId(customRoles[0].id);
    }
  }, [open, customRoles, customRoleId]);

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
        systemRole: (customRoleId.startsWith('system:')
          ? customRoleId.slice('system:'.length)
          : 'sales_rep') as CreateTenantUserRequest['systemRole'],
        customRoleId,
        permissionGrants: [],
        permissionDenies: [],
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
          <DialogDescription>Enter name, email, and a custom role.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Name" htmlFor="invite-name" required>
            <Input
              id="invite-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nadia Islam"
            />
          </FormField>

          <FormField label="Email" htmlFor="invite-email" required>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nadia@company.com"
            />
          </FormField>

          <FormField
            label="Role"
            htmlFor="invite-role"
            required
            labelAction={
              <Link
                href="/dashboard/settings/roles"
                className="text-xs text-primary hover:underline"
              >
                Create new role
              </Link>
            }
            hint={
              customRoles.length
                ? undefined
                : 'Create a custom role first — invite uses your roles only, not system defaults.'
            }
          >
            <FormSearchSelect
              id="invite-role"
              value={customRoleId}
              onChange={setCustomRoleId}
              placeholder="Select role…"
              searchPlaceholder="Search roles…"
              emptyMessage="No custom roles yet"
              options={customRoles.map((role) => ({
                value: role.id,
                label: role.name,
              }))}
            />
          </FormField>
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
