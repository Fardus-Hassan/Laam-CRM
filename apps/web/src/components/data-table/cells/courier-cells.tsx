'use client';

import type { OrderCourierStats } from '@laam/types';

import { cn } from '@/lib/utils';

function CourierMetric({
  label,
  value,
  valueClassName,
  className,
}: {
  label: string;
  value: number | string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <span className={cn('tabular-nums leading-none', className)}>
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className={cn('font-medium', valueClassName)}>{value}</span>
    </span>
  );
}

export function DataTableCourierStats({
  courier,
  className,
  compact = false,
}: {
  courier: OrderCourierStats;
  className?: string;
  compact?: boolean;
}) {
  const percent = Math.min(100, Math.max(0, courier.percent));
  const total = courier.to + courier.co + courier.su + courier.fa;

  return (
    <div className={cn('w-full space-y-1 text-[11px]', compact && 'space-y-0.5', className)}>
      <div className="grid grid-cols-3 items-center gap-1 leading-none">
        <CourierMetric label="To" value={courier.to} />
        <CourierMetric label="Co" value={courier.co} className="text-center" />
        <span className="truncate text-right font-semibold text-foreground">{courier.label}</span>
      </div>

      <div className="relative h-5 w-full overflow-hidden rounded-sm border border-border bg-muted">
        <div
          className="absolute inset-y-0 left-0 bg-primary"
          style={{ width: `${percent}%` }}
        />
        {percent < 100 ? (
          <div
            className="absolute inset-y-0 bg-destructive/80"
            style={{ left: `${percent}%`, right: 0 }}
          />
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-white drop-shadow-sm">
          {percent}%
        </span>
      </div>

      <div className="grid grid-cols-3 items-center gap-1 leading-none">
        <CourierMetric label="To" value={total} />
        <CourierMetric
          label="Su"
          value={courier.su}
          valueClassName="text-primary"
          className="text-center"
        />
        <CourierMetric
          label="Fa"
          value={courier.fa}
          valueClassName="text-destructive"
          className="text-right"
        />
      </div>
    </div>
  );
}
