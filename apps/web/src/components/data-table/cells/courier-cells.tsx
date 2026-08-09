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
 * Order / customer table Success Rate — larger, centered, cancel in red.
 */
export function DataTableCourierStats({
  shop,
  network,
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
  const hasNetwork = net.to > 0 || net.su > 0 || net.fa > 0;
  const percent = hasNetwork ? Math.min(100, Math.max(0, net.percent)) : 0;

  if (!hasNetwork && shopStats.to === 0) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center', className)}>
        <span className="text-sm tabular-nums text-muted-foreground">—</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-full w-full min-w-0 flex-col items-center justify-center gap-1.5 text-center',
        compact && 'gap-1',
        className,
      )}
    >
      {hasNetwork ? (
        <CourierSuccessRing percent={percent} size={compact ? 42 : 46} strokeWidth={4} />
      ) : (
        <div className="size-10 shrink-0 rounded-full border border-dashed border-border bg-muted/30" />
      )}
      <div className="min-w-0 leading-snug">
        {hasNetwork ? (
          <>
            <p className="text-[13px] font-semibold tabular-nums text-foreground">
              {percent}%
              <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                success
              </span>
            </p>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{net.su}</span>
              <span className="mx-0.5 opacity-40">/</span>
              {net.to} orders
            </p>
            {net.fa > 0 ? (
              <p className="text-[11px] font-medium tabular-nums text-destructive">
                {net.fa} cancel
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">No network data</p>
        )}
        {(shopStats.to > 0 || shopStats.co > 0) && (
          <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground/80">
            Shop {shopStats.to} · {shopStats.co} done
          </p>
        )}
      </div>
    </div>
  );
}
