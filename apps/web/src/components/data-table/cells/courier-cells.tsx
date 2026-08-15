'use client';

import type { CourierShopStats, OrderCourierStats } from '@laam/types';

import { CourierSuccessRing } from '@/features/courier/components/courier-success-visuals';
import { cn } from '@/lib/utils';

const EMPTY_NETWORK: OrderCourierStats = {
  to: 0,
  co: 0,
  su: 0,
  fa: 0,
  label: '—',
  percent: 0,
};

/**
 * Order / customer table Success Rate — ring left, stats right, optional meta footer.
 */
export function DataTableCourierStats({
  shop,
  network,
  courier,
  className,
  compact = false,
  /** Bottom line (e.g. "carrybee · status · consignment") */
  meta,
}: {
  shop?: CourierShopStats | null;
  network?: OrderCourierStats | null;
  courier?: OrderCourierStats | null;
  className?: string;
  compact?: boolean;
  meta?: string | null;
}) {
  const shopStats: CourierShopStats = shop ?? { to: 0, co: 0 };
  const net = network ?? courier ?? EMPTY_NETWORK;
  const hasNetwork = net.to > 0 || net.su > 0 || net.fa > 0;
  const percent = hasNetwork ? Math.min(100, Math.max(0, net.percent)) : 0;
  const hasShop = shopStats.to > 0 || shopStats.co > 0;
  const metaText = meta?.trim() || undefined;

  if (!hasNetwork && !hasShop && !metaText) {
    return (
      <div className={cn('flex h-full w-full items-center', className)}>
        <span className="text-sm tabular-nums text-muted-foreground">—</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-full w-full min-w-0 flex-col justify-center gap-1',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {hasNetwork ? (
          <CourierSuccessRing
            percent={percent}
            size={compact ? 36 : 40}
            strokeWidth={3.5}
          />
        ) : (
          <div
            className={cn(
              'shrink-0 rounded-full border border-dashed border-border bg-muted/30',
              compact ? 'size-9' : 'size-10',
            )}
          />
        )}

        <div className="min-w-0 flex-1 text-left leading-tight">
          {hasNetwork ? (
            <>
              <p className="text-[12px] font-semibold tabular-nums text-foreground">
                {percent}%
                <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
                  success
                </span>
              </p>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{net.su}</span>
                <span className="mx-0.5 opacity-40">/</span>
                {net.to} orders
              </p>
              {net.fa > 0 ? (
                <p className="text-[10px] font-medium tabular-nums text-destructive">
                  {net.fa} cancel
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground">No network data</p>
          )}
          {hasShop ? (
            <p className="text-[10px] tabular-nums text-muted-foreground/85">
              Shop {shopStats.to} · {shopStats.co} done
            </p>
          ) : null}
        </div>
      </div>

      {metaText ? (
        <p className="truncate text-[10px] leading-snug text-muted-foreground" title={metaText}>
          {metaText}
        </p>
      ) : null}
    </div>
  );
}
