'use client';

import * as React from 'react';
import type { CustomerListItem, CustomerSegmentCount, CustomerStatus } from '@laam/types';

import { cn } from '@/lib/utils';

type CustomerStatusSelectProps = {
  row: CustomerListItem;
  options: CustomerSegmentCount[];
  onChange: (row: CustomerListItem, status: CustomerStatus) => void | Promise<void>;
  className?: string;
  compact?: boolean;
};

export function CustomerStatusSelect({
  row,
  options,
  onChange,
  className,
  compact,
}: CustomerStatusSelectProps) {
  const [value, setValue] = React.useState(row.status);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setValue(row.status);
  }, [row.status, row.id]);

  const selectOptions = React.useMemo(() => {
    const map = new Map(options.map((o) => [o.id, o.label]));
    if (!map.has(row.status)) {
      map.set(row.status, row.statusLabel || row.status);
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [options, row.status, row.statusLabel]);

  async function handleChange(next: string) {
    if (next === value) return;
    const previous = value;
    setValue(next);
    setSaving(true);
    try {
      await onChange(row, next);
    } catch {
      setValue(previous);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={value}
      disabled={saving || selectOptions.length === 0}
      onChange={(e) => void handleChange(e.target.value)}
      aria-label={`Status for ${row.name}`}
      className={cn(
        'max-w-[11rem] rounded-md border border-input bg-background px-2 text-xs shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-60',
        compact ? 'h-7' : 'h-8',
        className,
      )}
    >
      {selectOptions.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
