'use client';

import * as React from 'react';
import type { TenantUser } from '@laam/types';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
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
import { cn } from '@/lib/utils';

export type OrderAssignResult = {
  employeeName: string;
  employeeUserId?: string;
};

type OrderAssignSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (result: OrderAssignResult) => void | Promise<void>;
  currentAgentName?: string;
  currentAgentUserId?: string;
};

type AgentOption = {
  value: string;
  userId?: string;
  name: string;
  email?: string;
  isCurrent: boolean;
};

export function OrderAssignSheet({
  open,
  onOpenChange,
  onAssign,
  currentAgentName,
  currentAgentUserId,
}: OrderAssignSheetProps) {
  const [selectedKey, setSelectedKey] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [users, setUsers] = React.useState<TenantUser[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setSelectedKey(
      currentAgentUserId
        ? `u:${currentAgentUserId}`
        : currentAgentName
          ? `n:${currentAgentName}`
          : '',
    );
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
  }, [open, currentAgentName, currentAgentUserId]);

  const options = React.useMemo((): AgentOption[] => {
    const base: AgentOption[] = users.map((u) => ({
      value: `u:${u.id}`,
      userId: u.id,
      name: u.name,
      email: u.email || undefined,
      isCurrent: Boolean(
        (currentAgentUserId && u.id === currentAgentUserId) ||
          (!currentAgentUserId && currentAgentName && u.name === currentAgentName),
      ),
    }));
    if (
      currentAgentName &&
      !base.some(
        (o) =>
          o.userId === currentAgentUserId ||
          (!currentAgentUserId && o.name === currentAgentName),
      )
    ) {
      base.unshift({
        value: currentAgentUserId ? `u:${currentAgentUserId}` : `n:${currentAgentName}`,
        userId: currentAgentUserId,
        name: currentAgentName,
        isCurrent: true,
      });
    }
    return base;
  }, [users, currentAgentName, currentAgentUserId]);

  async function handleSubmit() {
    const option = options.find((o) => o.value === selectedKey);
    if (!option) return;
    setSaving(true);
    try {
      await onAssign({
        employeeName: option.name,
        employeeUserId: option.userId,
      });
      onOpenChange(false);
      setSelectedKey('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Assign agent</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex min-h-0 flex-1 flex-col gap-3">
          <FormField label="Team member" className="min-h-0 flex-1">
            {loading ? (
              <p className="py-6 text-sm text-muted-foreground">Loading team members…</p>
            ) : options.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active users found. Add team members in Settings → Users.
              </p>
            ) : (
              <div
                role="listbox"
                aria-label="Team members"
                className="max-h-[min(28rem,calc(100vh-14rem))] space-y-1 overflow-y-auto rounded-lg border border-border/70 p-1"
              >
                {options.map((option) => {
                  const selected = selectedKey === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => setSelectedKey(option.value)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
                        selected
                          ? 'bg-primary/10 text-foreground'
                          : 'hover:bg-muted/60 text-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/40',
                        )}
                      >
                        {selected ? <Check className="size-2.5" strokeWidth={3} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {option.name}
                          {option.isCurrent ? (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              (current)
                            </span>
                          ) : null}
                        </span>
                        {option.email ? (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {option.email}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </FormField>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedKey || saving || loading}
            onClick={() => void handleSubmit()}
          >
            Assign
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
