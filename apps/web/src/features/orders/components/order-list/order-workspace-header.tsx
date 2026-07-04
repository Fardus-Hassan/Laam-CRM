'use client';

import * as React from 'react';
import { Pin, PinOff, RefreshCw } from 'lucide-react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  isOrderQueueFavorite,
  toggleOrderQueueFavorite,
} from '@/features/orders/lib/order-queue-favorites';
import { cn } from '@/lib/utils';

type OrderWorkspaceHeaderProps = {
  queueSlug: string;
  title: string;
  description?: string;
  lastRefreshedAt?: Date | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

export function OrderWorkspaceHeader({
  queueSlug,
  title,
  description,
  lastRefreshedAt,
  isRefreshing,
  onRefresh,
  className,
}: OrderWorkspaceHeaderProps) {
  const [pinned, setPinned] = React.useState(false);

  React.useEffect(() => {
    setPinned(isOrderQueueFavorite(queueSlug));
  }, [queueSlug]);

  function handleTogglePin() {
    toggleOrderQueueFavorite(queueSlug);
    const next = isOrderQueueFavorite(queueSlug);
    setPinned(next);
    toast.success(next ? 'Queue pinned' : 'Queue unpinned');
  }

  const refreshedLabel = lastRefreshedAt
    ? `Updated ${lastRefreshedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
        {refreshedLabel ? (
          <p className="mt-1 text-xs text-muted-foreground">{refreshedLabel}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={handleTogglePin}
          title={pinned ? 'Unpin queue' : 'Pin queue to sidebar'}
        >
          {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          {pinned ? 'Unpin' : 'Pin'}
        </Button>
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
      </div>
    </div>
  );
}
