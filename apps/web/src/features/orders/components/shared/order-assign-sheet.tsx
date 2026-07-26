'use client';

import * as React from 'react';
import type { TenantUser } from '@laam/types';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { rbacApi } from '@/features/rbac/api/rbac-api';

type OrderAssignSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (employeeName: string) => void | Promise<void>;
  currentAgentName?: string;
};

export function OrderAssignSheet({
  open,
  onOpenChange,
  onAssign,
  currentAgentName,
}: OrderAssignSheetProps) {
  const [employee, setEmployee] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [users, setUsers] = React.useState<TenantUser[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setEmployee(currentAgentName ?? '');
    let cancelled = false;
    setLoading(true);
    void rbacApi
      .listUsers('')
      .then((list) => {
        if (cancelled) return;
        setUsers(list.filter((u) => u.status === 'active'));
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load team members');
          setUsers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, currentAgentName]);

  const options = React.useMemo(() => {
    const base = users.map((u) => ({
      value: u.name,
      label: u.email ? `${u.name} · ${u.email}` : u.name,
    }));
    if (currentAgentName && !base.some((o) => o.value === currentAgentName)) {
      base.unshift({ value: currentAgentName, label: `${currentAgentName} (current)` });
    }
    return base;
  }, [users, currentAgentName]);

  async function handleSubmit() {
    if (!employee) return;
    setSaving(true);
    try {
      await onAssign(employee);
      onOpenChange(false);
      setEmployee('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Assign agent</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-3">
          <FormField label="Team member">
            <FormSearchSelect
              value={employee}
              onChange={setEmployee}
              options={options}
              placeholder={loading ? 'Loading…' : 'Search team member'}
              disabled={loading}
            />
          </FormField>
          {!loading && options.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No active users found. Add team members in Settings → Users.
            </p>
          ) : null}
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!employee || saving || loading} onClick={() => void handleSubmit()}>
            Assign
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
