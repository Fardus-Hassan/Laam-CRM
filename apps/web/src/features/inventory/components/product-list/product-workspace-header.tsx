'use client';

import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth/can';
import { cn } from '@/lib/utils';

type ProductWorkspaceHeaderProps = {
  lastRefreshedAt?: Date | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

export function ProductWorkspaceHeader({
  lastRefreshedAt,
  isRefreshing,
  onRefresh,
  className,
}: ProductWorkspaceHeaderProps) {
  const refreshedLabel = lastRefreshedAt
    ? `Updated ${lastRefreshedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">Product catalog</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Modhu, khejur, combos & gift boxes — stock, price, and variants in one place.
        </p>
        {refreshedLabel ? (
          <p className="mt-1 text-xs text-muted-foreground">{refreshedLabel}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {onRefresh ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            disabled={isRefreshing}
            onClick={onRefresh}
          >
            <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        ) : null}
        <Can permission="inventory.create">
          <Button type="button" size="sm" className="h-8" asChild>
            <Link href="/dashboard/inventory/products/new">
              <Plus className="size-3.5" />
              New product
            </Link>
          </Button>
        </Can>
      </div>
    </div>
  );
}
