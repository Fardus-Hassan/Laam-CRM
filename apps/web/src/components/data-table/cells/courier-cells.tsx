'use client';

import type { CourierShopStats, OrderCourierStats } from '@laam/types';

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

const EMPTY_NETWORK: OrderCourierStats = {
  to: 0,
  co: 0,
  su: 0,
  fa: 0,
  label: '—',
  percent: 0,
};

/**
 * Bizmation-style courier cell:
 * - Top To/Co = this shop (CRM)
 * - Bar % + bottom To/Su/Fa = network lifetime
 */
export function DataTableCourierStats({
  shop,
  network,
  /** @deprecated Use `network` — kept for older call sites. */
  courier,
  className,
  compact = false,
}: {
  shop?: CourierShopStats | null;
  network?: OrderCourierStats | null;
  courier?: OrderCourierStats | null;
  className?: string;
  compact?: boolean;
}) {
  const shopStats: CourierShopStats = shop ?? { to: 0, co: 0 };
  const net = network ?? courier ?? EMPTY_NETWORK;
  const percent = Math.min(100, Math.max(0, net.percent));

  return (
    <div className={cn('w-full space-y-1 text-[11px]', compact && 'space-y-0.5', className)}>
      <div className="grid grid-cols-3 items-center gap-1 leading-none">
        <CourierMetric label="To" value={shopStats.to} />
        <CourierMetric label="Co" value={shopStats.co} className="text-center" />
        <span className="truncate text-right text-[10px] font-semibold text-muted-foreground">
          Shop
        </span>
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
        <CourierMetric label="To" value={net.to} />
        <CourierMetric
          label="Su"
          value={net.su}
          valueClassName="text-primary"
          className="text-center"
        />
        <CourierMetric
          label="Fa"
          value={net.fa}
          valueClassName="text-destructive"
          className="text-right"
        />
      </div>
    </div>
  );
}
