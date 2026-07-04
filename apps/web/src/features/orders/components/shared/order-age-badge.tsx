'use client';

import {
  formatOrderAgeLabel,
  getOrderAgeLevel,
  type OrderAgeLevel,
} from '@/features/orders/lib/order-age';
import { cn } from '@/lib/utils';

const LEVEL_CLASS: Record<OrderAgeLevel, string> = {
  ok: 'border-border bg-muted/50 text-muted-foreground',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  critical: 'border-destructive/40 bg-destructive/10 text-destructive',
};

type OrderAgeBadgeProps = {
  createdAt: string;
  status: string;
  className?: string;
};

export function OrderAgeBadge({ createdAt, status, className }: OrderAgeBadgeProps) {
  const level = getOrderAgeLevel(createdAt, status);
  if (!level) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums',
        LEVEL_CLASS[level],
        className,
      )}
      title={level === 'critical' ? 'Over 72h in queue' : level === 'warning' ? 'Over 48h in queue' : 'Within SLA'}
    >
      {formatOrderAgeLabel(createdAt)}
    </span>
  );
}
