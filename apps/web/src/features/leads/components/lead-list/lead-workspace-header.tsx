'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LeadWorkspaceHeaderProps = {
  title: string;
  description?: string;
  lastRefreshedAt?: Date | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

export function LeadWorkspaceHeader({
  title,
  description,
  lastRefreshedAt,
  isRefreshing,
  onRefresh,
  className,
}: LeadWorkspaceHeaderProps) {
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
        <Button type="button" size="sm" asChild>
          <Link href="/dashboard/leads/new">
            <Plus className="size-3.5" />
            New lead
          </Link>
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
