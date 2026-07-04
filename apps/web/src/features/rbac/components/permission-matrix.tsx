'use client';

import type { Permission } from '@laam/types';
import { PERMISSION_GROUPS, PERMISSION_LABELS } from '@laam/types';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

type PermissionMatrixProps = {
  value: Permission[];
  onChange: (permissions: Permission[]) => void;
  className?: string;
  disabled?: boolean;
};

export function PermissionMatrix({
  value,
  onChange,
  className,
  disabled = false,
}: PermissionMatrixProps) {
  const selected = new Set(value);

  const toggle = (permission: Permission, checked: boolean) => {
    const next = new Set(selected);
    if (checked) {
      next.add(permission);
    } else {
      next.delete(permission);
    }
    onChange([...next]);
  };

  const toggleGroup = (permissions: Permission[], checked: boolean) => {
    const next = new Set(selected);
    for (const permission of permissions) {
      if (checked) {
        next.add(permission);
      } else {
        next.delete(permission);
      }
    }
    onChange([...next]);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {PERMISSION_GROUPS.map((group) => {
        const allSelected = group.permissions.every((p) => selected.has(p));
        const someSelected = group.permissions.some((p) => selected.has(p));

        return (
          <div key={group.id} className="rounded-lg border border-border/70 p-4">
            <div className="mb-3 flex items-center gap-2">
              <input
                id={`group-${group.id}`}
                type="checkbox"
                className="size-4 rounded border-border"
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = someSelected && !allSelected;
                  }
                }}
                disabled={disabled}
                onChange={(event) =>
                  toggleGroup(group.permissions, event.target.checked)
                }
              />
              <Label htmlFor={`group-${group.id}`} className="text-sm font-semibold">
                {group.label}
              </Label>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {group.permissions.map((permission) => (
                <li key={permission} className="flex items-center gap-2">
                  <input
                    id={permission}
                    type="checkbox"
                    className="size-4 rounded border-border"
                    checked={selected.has(permission)}
                    disabled={disabled}
                    onChange={(event) =>
                      toggle(permission, event.target.checked)
                    }
                  />
                  <Label htmlFor={permission} className="text-xs font-normal">
                    {PERMISSION_LABELS[permission]}
                  </Label>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
