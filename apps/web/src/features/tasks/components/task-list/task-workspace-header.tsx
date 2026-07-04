'use client';

import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TaskWorkspaceHeaderProps = {
  lastRefreshedAt?: Date | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

export function TaskWorkspaceHeader({
  lastRefreshedAt,
  isRefreshing,
  onRefresh,
  className,
}: TaskWorkspaceHeaderProps) {
  const refreshedLabel = lastRefreshedAt
    ? `Updated ${lastRefreshedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">Team tasks</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Calls, order confirmations, courier checks, and payment follow-ups for your shop.
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
        <Button type="button" size="sm" className="h-8" asChild>
          <Link href="/dashboard/tasks/new">
            <Plus className="size-3.5" />
            New task
          </Link>
        </Button>
      </div>
    </div>
  );
}
