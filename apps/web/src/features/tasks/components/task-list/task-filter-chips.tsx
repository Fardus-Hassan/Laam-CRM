'use client';

import Link from 'next/link';
import type { TaskFilterCount } from '@laam/types';

import { cn } from '@/lib/utils';

type TaskFilterChipsProps = {
  filters: TaskFilterCount[];
  activeFilterId: string;
  className?: string;
};

export function TaskFilterChips({ filters, activeFilterId, className }: TaskFilterChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {filters.map((filter) => {
        const isActive = filter.id === activeFilterId;
        const params = new URLSearchParams();
        if (filter.id !== 'all') params.set('filter', filter.id);
        const href = params.toString()
          ? `/dashboard/tasks?${params.toString()}`
          : '/dashboard/tasks';

        return (
          <Link
            key={filter.id}
            href={href}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {filter.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                isActive ? 'bg-primary-foreground/20' : 'bg-muted',
              )}
            >
              {filter.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
