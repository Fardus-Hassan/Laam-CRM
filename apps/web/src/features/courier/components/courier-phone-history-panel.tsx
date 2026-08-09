'use client';

import * as React from 'react';
import type {
  CourierPhoneHistory,
  CourierProviderHistory,
  OrderCourierStats,
} from '@laam/types';
import {
  courierHistoryLabel,
  sortCourierHistoryProviders,
} from '@laam/types';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { courierPhoneHistoryApi } from '@/features/courier/api/courier-phone-history-api';
import {
  CourierHistorySkeleton,
  CourierLogoStrip,
  CourierSuccessRing,
} from '@/features/courier/components/courier-success-visuals';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

type CourierPhoneHistoryPanelProps = {
  phone?: string | null;
  className?: string;
  autoLoad?: boolean;
  compact?: boolean;
  variant?: 'cards' | 'rows';
  /** This-shop CRM order count — shown on Overall card. */
  shopOrders?: number;
  /** This-shop delivered/completed count — shown on Overall card. */
  shopDelivered?: number;
};

function phoneDigits(phone?: string | null): string {
  return (phone ?? '').replace(/\D/g, '');
}

function emptyStats(): OrderCourierStats {
  return { to: 0, co: 0, su: 0, fa: 0, label: 'New', percent: 0 };
}

export function CourierPhoneHistoryPanel({
  phone,
  className,
  autoLoad = true,
  compact,
  variant = 'cards',
  shopOrders,
  shopDelivered,
}: CourierPhoneHistoryPanelProps) {
  const [data, setData] = React.useState<CourierPhoneHistory | null>(null);
  const [loading, setLoading] = React.useState(() => phoneDigits(phone).length >= 10);
  const [loadError, setLoadError] = React.useState(false);
  const hasValidPhone = phoneDigits(phone).length >= 10;
  const phoneKey = phoneDigits(phone);

  const load = React.useCallback(
    async (refresh = false) => {
      const trimmed = (phone ?? '').trim();
      if (phoneDigits(trimmed).length < 10) {
        setData(null);
        setLoading(false);
        setLoadError(false);
        return;
      }
      setLoading(true);
      setLoadError(false);
      try {
        const next = refresh
          ? await courierPhoneHistoryApi.refresh(trimmed)
          : await courierPhoneHistoryApi.check(trimmed, false);
        setData(next);
      } catch (error) {
        setData(null);
        setLoadError(true);
        toast.error(error instanceof Error ? error.message : 'Courier history failed');
      } finally {
        setLoading(false);
      }
    },
    [phone],
  );

  React.useEffect(() => {
    if (!autoLoad) return;
    if (!hasValidPhone) {
      setData(null);
      setLoading(false);
      setLoadError(false);
      return;
    }

    // Phone changed / first paint — show skeleton immediately (no empty 0 flash).
    setData(null);
    setLoadError(false);
    setLoading(true);
    const t = window.setTimeout(() => void load(false), 400);
    return () => window.clearTimeout(t);
  }, [autoLoad, hasValidPhone, phoneKey, load]);

  const providers = data ? sortCourierHistoryProviders(data.providers) : [];
  const aggregate = data?.aggregate ?? emptyStats();
  // Skeleton until first successful payload — never flash empty "No data" zeros.
  const showSkeleton = hasValidPhone && loading && !data;

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="min-w-0 shrink-0">
          <p className="text-sm font-semibold tracking-tight">Courier success rate</p>
          <p className="text-[11px] text-muted-foreground">
            Network delivery history for this phone
          </p>
        </div>

        {data?.riskVerdict ? (
          <RiskBanner verdict={data.riskVerdict} compact className="min-w-0 flex-1" />
        ) : null}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto h-8 shrink-0"
          disabled={loading || !hasValidPhone}
          onClick={() => void load(true)}
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {!hasValidPhone ? (
        <p className="text-xs text-muted-foreground">Enter a valid phone to load history.</p>
      ) : showSkeleton || !data ? (
        loadError ? (
          <p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Couldn’t load courier history. Tap Refresh to try again.
          </p>
        ) : (
          <CourierHistorySkeleton count={compact ? 5 : 6} />
        )
      ) : variant === 'cards' ? (
        <div className="space-y-2.5">
          <div
            className={cn(
              'grid gap-2',
              compact
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8'
                : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
            )}
          >
            <OverallCard
              stats={aggregate}
              ready={Boolean(data)}
              shopOrders={shopOrders}
              shopDelivered={shopDelivered}
            />
            {providers.map((p) => (
              <ProviderCard key={p.provider} provider={p} />
            ))}
          </div>

          {data?.reports && data.reports.length > 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold">Reports ({data.reports.length})</p>
              <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                {data.reports.slice(0, 5).map((r, i) => (
                  <li key={i}>
                    {[r.source, r.title, r.details, r.date].filter(Boolean).join(' — ')}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {data ? (
            <p className="text-[10px] text-muted-foreground">
              Updated {formatDateTime(data.fetchedAt)} · {data.source}
              {data.stale ? ' · cache expired — Refresh for latest' : ''}
              {providers.length ? ` · ${providers.length} couriers` : ''}
            </p>
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            'grid gap-3 rounded-xl border bg-card p-3',
            compact ? 'lg:grid-cols-[1.4fr_0.8fr]' : 'lg:grid-cols-[1.35fr_0.85fr]',
          )}
        >
          <div className="space-y-2.5">
            {providers.map((p) => (
              <ProviderRow key={p.provider} provider={p} />
            ))}
          </div>
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/20 p-3">
            <CourierSuccessRing percent={aggregate.percent} size={88} strokeWidth={8} showLabel />
            <div className="text-center text-xs">
              <p className="font-semibold">All network</p>
              <p className="tabular-nums text-muted-foreground">
                {aggregate.to} total · {aggregate.su} success ·{' '}
                <span className="text-destructive">{aggregate.fa} cancel</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverallCard({
  stats,
  ready,
  shopOrders,
  shopDelivered,
}: {
  stats: OrderCourierStats;
  ready: boolean;
  shopOrders?: number;
  shopDelivered?: number;
}) {
  const hasData = ready && stats.to > 0;
  const percent = hasData ? Math.min(100, Math.max(0, stats.percent)) : 0;
  const showShop = shopOrders !== undefined || shopDelivered !== undefined;

  return (
    <div className="flex flex-col rounded-xl border border-primary/20 bg-secondary/35 p-3 text-center">
      <div className="flex h-10 items-center justify-center gap-2 rounded-lg border border-primary/15 bg-background/80 px-2.5">
        <Shield className="size-4 text-primary" strokeWidth={2} />
        <span className="text-xs font-semibold tracking-tight">Overall</span>
      </div>

      {showShop ? (
        <div className="mt-2 flex items-center justify-center gap-3 rounded-md bg-background/60 px-2 py-1.5 text-[11px] tabular-nums">
          <span>
            <span className="text-muted-foreground">Shop </span>
            <span className="font-semibold">{shopOrders ?? 0}</span>
          </span>
          <span className="text-border">·</span>
          <span>
            <span className="text-muted-foreground">Done </span>
            <span className="font-semibold text-primary">{shopDelivered ?? 0}</span>
          </span>
        </div>
      ) : null}

      <CardBody hasData={hasData} percent={percent} stats={stats} emptyLabel="No data" />
    </div>
  );
}

function ProviderCard({ provider }: { provider: CourierProviderHistory }) {
  const stats = provider.stats ?? emptyStats();
  const soon = provider.status === 'soon';
  const hasData =
    provider.status === 'ready' &&
    provider.countsAvailable &&
    (stats.to > 0 || stats.su > 0 || stats.fa > 0);
  const percent = hasData ? Math.min(100, Math.max(0, stats.percent)) : 0;
  const label = courierHistoryLabel(provider.provider, provider.label);

  return (
    <div className="flex flex-col rounded-xl border border-border/80 bg-card p-3 text-center">
      <CourierLogoStrip src={provider.logo} label={label} />
      <CardBody
        hasData={hasData}
        percent={percent}
        stats={stats}
        emptyLabel={soon ? 'Soon' : 'No data'}
      />
    </div>
  );
}

function CardBody({
  hasData,
  percent,
  stats,
  emptyLabel,
}: {
  hasData: boolean;
  percent: number;
  stats: OrderCourierStats;
  emptyLabel: string;
}) {
  return (
    <>
      <div className="mt-3 flex flex-col items-center justify-center">
        {hasData ? (
          <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight sm:text-[1.65rem]">
            {percent}
            <span className="text-base font-medium text-muted-foreground">%</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1 border-t border-border/50 pt-2.5 text-[11px] tabular-nums">
        <MiniStat label="Total" value={hasData ? stats.to : 0} />
        <MiniStat label="Success" value={hasData ? stats.su : 0} emphasize />
        <MiniStat label="Cancel" value={hasData ? stats.fa : 0} danger />
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${hasData ? percent : 0}%` }}
        />
      </div>
    </>
  );
}

function MiniStat({
  label,
  value,
  emphasize,
  danger,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="min-w-0 text-center">
      <p className="truncate text-[10px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-sm font-semibold tabular-nums sm:text-[15px]',
          danger && value > 0
            ? 'text-destructive'
            : emphasize
              ? 'text-primary'
              : 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ProviderRow({ provider }: { provider: CourierProviderHistory }) {
  const stats = provider.stats ?? emptyStats();
  const showBar =
    provider.countsAvailable && (stats.to > 0 || stats.su > 0 || stats.fa > 0);
  const percent = showBar ? Math.min(100, Math.max(0, stats.percent)) : 0;
  const label = courierHistoryLabel(provider.provider, provider.label);

  return (
    <div className="space-y-1.5 rounded-lg border border-border/60 p-2">
      <CourierLogoStrip src={provider.logo} label={label} />
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        {showBar ? (
          <span className="text-sm font-semibold tabular-nums">{percent}%</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">No data</span>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        {showBar ? (
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        ) : null}
      </div>
      <p className="px-0.5 text-center text-[11px] tabular-nums text-muted-foreground">
        {showBar ? (
          <>
            {stats.to} total · {stats.su} success ·{' '}
            <span className="font-medium text-destructive">{stats.fa} cancel</span>
          </>
        ) : provider.status === 'soon' ? (
          'Coming soon'
        ) : (
          'No data'
        )}
      </p>
    </div>
  );
}

function RiskBanner({
  verdict,
  compact,
  className,
}: {
  verdict: NonNullable<CourierPhoneHistory['riskVerdict']>;
  compact?: boolean;
  className?: string;
}) {
  const high = /high|fraud|risky/i.test(verdict.level) || verdict.color === 'red';
  const mid =
    !high &&
    (/medium|caution|moderate/i.test(verdict.level) || verdict.color === 'yellow');

  const tone = high
    ? 'border-destructive/35 bg-destructive/10 text-destructive'
    : mid
      ? 'border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100'
      : 'border-primary/25 bg-secondary/50 text-foreground';

  const detail = [verdict.action, verdict.reasons?.join(' · ')].filter(Boolean).join(' — ');

  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug',
          tone,
          className,
        )}
        title={detail || undefined}
      >
        <AlertTriangle className="size-3.5 shrink-0 opacity-80" />
        <span className="min-w-0 truncate">
          <span className="font-semibold">{verdict.label}</span>
          {detail ? (
            <span className="text-muted-foreground">
              {' · '}
              {detail}
            </span>
          ) : null}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-xl border px-3 py-2 text-xs',
        tone,
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 opacity-80" />
      <div className="min-w-0">
        <p className="font-semibold">{verdict.label}</p>
        {verdict.action ? (
          <p className="text-[11px] text-muted-foreground">{verdict.action}</p>
        ) : null}
        {verdict.reasons?.length ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {verdict.reasons.join(' · ')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
