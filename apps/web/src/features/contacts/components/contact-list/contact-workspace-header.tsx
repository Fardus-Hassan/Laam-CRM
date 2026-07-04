'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ContactWorkspaceHeaderProps = {
  lastRefreshedAt?: Date | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

export function ContactWorkspaceHeader({
  lastRefreshedAt,
  isRefreshing,
  onRefresh,
  className,
}: ContactWorkspaceHeaderProps) {
  const refreshedLabel = lastRefreshedAt
    ? `Updated ${lastRefreshedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">Contact workspace</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Buyers, suppliers, courier partners — one place to call, message, and follow up.
        </p>
        {refreshedLabel ? (
          <p className="mt-1 text-xs text-muted-foreground">{refreshedLabel}</p>
        ) : null}
      </div>
      {onRefresh ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      ) : null}
    </div>
  );
}
