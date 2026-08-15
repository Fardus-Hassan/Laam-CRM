'use client';

/**
 * Customer-detail-only courier panel.
 * Intentionally separate from orders shareable CourierPhoneHistoryPanel so
 * create-order / order-detail layouts stay unchanged.
 */

import * as React from 'react';
import type { CourierPhoneHistory, OrderCourierStats } from '@laam/types';
import {
  courierHistoryLabel,
  sortCourierHistoryProviders,
} from '@laam/types';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { CompactPager } from '@/components/ui/compact-pager';
import { Button } from '@/components/ui/button';
import { courierPhoneHistoryApi } from '@/features/courier/api/courier-phone-history-api';
import { CourierLogoStrip } from '@/features/courier/components/courier-success-visuals';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 4;

type CustomerCourierNetworkPanelProps = {
  phone: string;
  shopOrders?: number;
  shopDelivered?: number;
  className?: string;
};

function phoneDigits(phone?: string | null): string {
  return (phone ?? '').replace(/\D/g, '');
}

function emptyStats(): OrderCourierStats {
  return { to: 0, co: 0, su: 0, fa: 0, label: 'New', percent: 0 };
}

function providerHasData(p: CourierPhoneHistory['providers'][number]): boolean {
  const stats = p.stats ?? emptyStats();
  return (
    p.status === 'ready' &&
    Boolean(p.countsAvailable) &&
    (stats.to > 0 || stats.su > 0 || stats.fa > 0)
  );
}

export function CustomerCourierNetworkPanel({
  phone,
  shopOrders,
  shopDelivered,
  className,
}: CustomerCourierNetworkPanelProps) {
  const [data, setData] = React.useState<CourierPhoneHistory | null>(null);
  const [loading, setLoading] = React.useState(() => phoneDigits(phone).length >= 10);
  const [loadError, setLoadError] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hideEmpty, setHideEmpty] = React.useState(true);
  const hasValidPhone = phoneDigits(phone).length >= 10;
  const phoneKey = phoneDigits(phone);

  const load = React.useCallback(
    async (refresh = false) => {
      const trimmed = phone.trim();
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
        setPage(1);
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
    if (!hasValidPhone) {
      setData(null);
      setLoading(false);
      setLoadError(false);
      return;
    }
    setData(null);
    setLoading(true);
    setPage(1);
    const t = window.setTimeout(() => void load(false), 300);
    return () => window.clearTimeout(t);
  }, [hasValidPhone, phoneKey, load]);

  const allProviders = data ? sortCourierHistoryProviders(data.providers) : [];
  const filtered = hideEmpty
    ? allProviders.filter((p) => providerHasData(p) || p.status === 'soon')
    : allProviders;
  const visible =
    hideEmpty && filtered.length === 0 && allProviders.length > 0 ? allProviders : filtered;
  const emptyHidden = hideEmpty
    ? allProviders.filter((p) => !providerHasData(p) && p.status !== 'soon').length
    : 0;

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const aggregate = data?.aggregate ?? emptyStats();
  const hasNetwork = aggregate.to > 0;
  const percent = hasNetwork ? Math.min(100, Math.max(0, aggregate.percent)) : 0;
  const showSkeleton = hasValidPhone && loading && !data;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Courier success rate</p>
          <p className="text-xs text-muted-foreground">Network history for this phone</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          disabled={loading || !hasValidPhone}
          onClick={() => void load(true)}
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {data?.riskVerdict ? (
        <RiskLine verdict={data.riskVerdict} />
      ) : null}

      {!hasValidPhone ? (
        <p className="text-sm text-muted-foreground">Enter a valid phone to load history.</p>
      ) : showSkeleton ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      ) : loadError || !data ? (
        <p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Couldn&apos;t load courier history. Tap Refresh to try again.
        </p>
      ) : (
        <>
          {/* Overall summary — single column, no grid crush */}
          <div className="rounded-lg border border-primary/20 bg-secondary/25 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Overall network</p>
                <p className="text-xs text-muted-foreground">
                  {hasNetwork ? 'Aggregate delivery rate' : 'No network data yet'}
                </p>
              </div>
              <p className="text-2xl font-semibold tabular-nums leading-none">
                {hasNetwork ? (
                  <>
                    {percent}
                    <span className="text-sm font-medium text-muted-foreground">%</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </p>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-sm">
              <Metric label="Shop orders" value={shopOrders ?? 0} />
              <Metric label="Shop done" value={shopDelivered ?? 0} emphasize />
              <Metric label="Total" value={hasNetwork ? aggregate.to : 0} />
              <Metric label="Success" value={hasNetwork ? aggregate.su : 0} emphasize />
              <Metric
                label="Cancel"
                value={hasNetwork ? aggregate.fa : 0}
                danger
                className="col-span-2 sm:col-span-1"
              />
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${hasNetwork ? percent : 0}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Couriers
              {visible.length ? (
                <span className="tabular-nums"> · {visible.length}</span>
              ) : null}
            </p>
            {emptyHidden > 0 || !hideEmpty ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setHideEmpty((v) => !v);
                  setPage(1);
                }}
              >
                {hideEmpty ? `Show empty (${emptyHidden})` : 'Hide empty'}
              </Button>
            ) : null}
          </div>

          {pageItems.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              No courier history yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {pageItems.map((provider) => {
                const stats = provider.stats ?? emptyStats();
                const hasData = providerHasData(provider);
                const p = hasData ? Math.min(100, Math.max(0, stats.percent)) : 0;
                const label = courierHistoryLabel(provider.provider, provider.label);
                return (
                  <li
                    key={provider.provider}
                    className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-card px-2.5 py-2"
                  >
                    {/* Fixed chip logo — never full-width stretch in sidebar */}
                    <CourierLogoStrip
                      src={provider.logo}
                      label={label}
                      className="!h-8 !w-[4.75rem] shrink-0 !px-1.5"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{label}</p>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {hasData ? (
                            `${p}%`
                          ) : (
                            <span className="text-xs font-normal text-muted-foreground">
                              {provider.status === 'soon' ? 'Soon' : 'No data'}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted">
                        {hasData ? (
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${p}%` }}
                          />
                        ) : null}
                      </div>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {hasData ? (
                          <>
                            {stats.to} total · {stats.su} success ·{' '}
                            <span
                              className={
                                stats.fa > 0 ? 'font-medium text-destructive' : undefined
                              }
                            >
                              {stats.fa} cancel
                            </span>
                          </>
                        ) : provider.status === 'soon' ? (
                          'Coming soon'
                        ) : (
                          'No history'
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {visible.length > PAGE_SIZE ? (
            <CompactPager
              page={safePage}
              totalPages={totalPages}
              totalItems={visible.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          ) : null}

          <p className="text-xs text-muted-foreground">
            Updated {formatDateTime(data.fetchedAt)} · {data.source}
            {data.stale ? ' · Refresh for latest' : ''}
            {allProviders.length ? ` · ${allProviders.length} couriers` : ''}
          </p>
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  emphasize,
  danger,
  className,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5',
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-sm font-semibold tabular-nums',
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

function RiskLine({
  verdict,
}: {
  verdict: NonNullable<CourierPhoneHistory['riskVerdict']>;
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

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs',
        tone,
      )}
      title={detail || undefined}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 opacity-80" />
      <div className="min-w-0">
        <p className="font-semibold">{verdict.label}</p>
        {detail ? <p className="mt-0.5 line-clamp-2 text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}
