'use client';

import { Search } from 'lucide-react';

import { FormInput } from '@/components/form/form-input';
import { cn } from '@/lib/utils';

type TaskListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  className?: string;
};

export function TaskListToolbar({ search, onSearchChange, className }: TaskListToolbarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <FormInput
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search task, customer, mobile, order…"
        className="pl-9"
      />
    </div>
  );
}
