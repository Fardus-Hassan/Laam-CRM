import type { SystemHealthItem } from '@laam/types';

import { cn } from '@/lib/utils';

const STATUS_DOT = {
  operational: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-red-500',
} as const;

const STATUS_LABEL = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
} as const;

type SystemHealthListProps = {
  items: SystemHealthItem[];
  className?: string;
};

export function SystemHealthList({ items, className }: SystemHealthListProps) {
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
        >
          <span className="text-sm text-foreground">{item.label}</span>
          <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
            <span
              className={cn('size-2 rounded-full', STATUS_DOT[item.status])}
              aria-hidden
            />
            {item.statusLabel ?? STATUS_LABEL[item.status]}
          </span>
        </li>
      ))}
    </ul>
  );
}
