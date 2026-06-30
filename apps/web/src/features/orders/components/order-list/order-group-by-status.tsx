'use client';

import { useRouter } from 'next/navigation';
import { Package, RotateCcw, ShoppingBag } from 'lucide-react';

import { CollapsibleSection } from '@/components/form/collapsible-section';
import { useStatusCounts } from '@/features/orders/hooks/use-status-counts';
import { getStatusCountsForGroupBy } from '@/features/orders/data/mock-status-counts';
import { cn } from '@/lib/utils';

export function OrderGroupByStatus() {
  const router = useRouter();
  const { total, returnRatio } = useStatusCounts();
  const tiles = getStatusCountsForGroupBy().filter((item) => item.count > 0).slice(0, 16);

  return (
    <CollapsibleSection title="Group by Status" defaultOpen>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {tiles.map(({ config, count, unitCount, percent }) => (
          <button
            key={config.slug}
            type="button"
            className={cn(
              'group flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left',
              'transition-colors hover:border-primary/40 hover:bg-muted/40',
            )}
            onClick={() => router.push(`/dashboard/orders?status=${config.slug}`)}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShoppingBag className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-bold tabular-nums leading-none text-primary">
                {count.toLocaleString()}
              </span>
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {percent.toFixed(2)}% · {unitCount} un.
              </span>
              <span className="mt-1 block truncate text-xs font-medium text-foreground">
                {config.label}
              </span>
            </span>
          </button>
        ))}

        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3',
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Package className="size-4" />
          </span>
          <span>
            <span className="block text-xl font-bold tabular-nums text-primary">
              {total.toLocaleString()}
            </span>
            <span className="mt-1 block text-xs font-medium text-foreground">Total Orders</span>
          </span>
        </div>

        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3',
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive/15 text-destructive">
            <RotateCcw className="size-4" />
          </span>
          <span>
            <span className="block text-xl font-bold tabular-nums text-destructive">
              {returnRatio.percent.toFixed(2)}%
            </span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {returnRatio.count.toLocaleString()} orders
            </span>
            <span className="mt-0.5 block text-xs font-medium text-foreground">Return Ratio</span>
          </span>
        </div>
      </div>
    </CollapsibleSection>
  );
}
