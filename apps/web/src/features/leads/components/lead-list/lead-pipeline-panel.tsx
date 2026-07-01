'use client';

import * as React from 'react';
import Link from 'next/link';
import type { LeadPipelineStats } from '@laam/types';
import { Target, TrendingUp, UserX } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { buildLeadTabHref, type LeadListContext } from '@/features/leads/config/lead-list-context';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type LeadPipelinePanelProps = {
  stats: LeadPipelineStats | null;
  isLoading?: boolean;
  activeTabId: LeadListContext['activeTabId'];
  sourceFilter?: LeadListContext['sourceFilter'];
  hasAgentFilter?: boolean;
  className?: string;
};

export function LeadPipelinePanel({
  stats,
  isLoading,
  activeTabId,
  sourceFilter,
  hasAgentFilter,
  className,
}: LeadPipelinePanelProps) {
  const filteredView = Boolean(sourceFilter || hasAgentFilter);
  const funnelStages = (stats?.stages ?? []).filter(
    (stage) => stage.id !== 'all' && stage.id !== 'unassigned' && stage.count > 0,
  );

  return (
    <Card className={cn('gap-0 overflow-hidden py-0 shadow-none', className)}>
      <CardContent className="space-y-3 p-3 sm:p-4">
        {isLoading ? (
          <PipelineSkeleton />
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricTile
                icon={<Target className="size-3.5" />}
                label="Total leads"
                value={stats.totalCount.toLocaleString()}
                tone="primary"
              />
              <MetricTile
                icon={<TrendingUp className="size-3.5" />}
                label="Pipeline value"
                value={formatCurrency(stats.totalEstimatedValue)}
              />
              <MetricTile
                icon={<TrendingUp className="size-3.5" />}
                label="Conversion"
                value={`${stats.conversionRate.toFixed(1)}%`}
                hint={`${stats.convertedCount} converted`}
                tone="success"
              />
              <Link
                href={buildLeadTabHref('unassigned', sourceFilter)}
                className={cn(
                  'rounded-lg border border-violet-500/25 bg-violet-500/5 p-2.5 transition-colors',
                  'hover:border-violet-500/40 hover:bg-violet-500/10',
                  activeTabId === 'unassigned' && 'ring-2 ring-violet-500/40',
                )}
              >
                <div className="flex items-center gap-2 text-violet-600">
                  <UserX className="size-3.5 shrink-0" />
                  <span className="text-[11px] font-medium text-muted-foreground">Unassigned</span>
                </div>
                <p className="mt-1 text-lg font-bold tabular-nums leading-none">
                  {stats.unassignedCount}
                </p>
              </Link>
            </div>

            {funnelStages.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  {funnelStages.map((stage) => (
                    <div
                      key={stage.id}
                      className="h-full min-w-[2px] transition-[width] duration-300"
                      style={{
                        width: `${Math.max(stage.share * 100, stage.count > 0 ? 4 : 0)}%`,
                        backgroundColor: stage.color,
                      }}
                      title={`${stage.label}: ${stage.count}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {funnelStages.map((stage) => (
                    <span
                      key={`legend-${stage.id}`}
                      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.label} ({stage.count})
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {filteredView ? (
              <p className="text-[11px] text-muted-foreground">
                Stage counts reflect your current source and agent filters.
              </p>
            ) : null}

            <div
              className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4"
              role="tablist"
              aria-label="Lead pipeline stages"
            >
              {stats.stages.map((stage) => {
                const href = buildLeadTabHref(stage.id, sourceFilter);
                const isActive = activeTabId === stage.id;

                return (
                  <Link
                    key={stage.id}
                    href={href}
                    role="tab"
                    aria-selected={isActive}
                    className={cn(
                      'flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors',
                      isActive
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border bg-card hover:border-primary/30 hover:bg-muted/40',
                    )}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{stage.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {stats.totalCount > 0
                          ? `${(stage.share * 100).toFixed(0)}% of pipeline`
                          : '0%'}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums',
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted',
                      )}
                    >
                      {stage.count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Pipeline data unavailable.</p>
        )}
      </CardContent>
    </Card>
  );
}

function MetricTile({
  icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'primary' | 'success';
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-2.5',
        tone === 'primary' && 'border-primary/25 bg-primary/5',
        tone === 'success' && 'border-emerald-500/25 bg-emerald-500/5',
        tone === 'default' && 'border-border bg-muted/20',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1.5 text-muted-foreground',
          tone === 'primary' && 'text-primary',
          tone === 'success' && 'text-emerald-600',
        )}
      >
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p
        className={cn(
          'mt-1 truncate text-lg font-bold tabular-nums leading-none',
          tone === 'primary' && 'text-primary',
          tone === 'success' && 'text-emerald-600',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function PipelineSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-12 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
