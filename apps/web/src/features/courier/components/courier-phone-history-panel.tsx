'use client';

import * as React from 'react';
import type {
  CourierHistoryProviderId,
  CourierPhoneHistory,
  CourierProviderHistory,
  OrderCourierStats,
} from '@laam/types';
import {
  COURIER_HISTORY_PROVIDER_LABEL,
  COURIER_HISTORY_PROVIDER_ORDER,
} from '@laam/types';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { courierPhoneHistoryApi } from '@/features/courier/api/courier-phone-history-api';
import { cn } from '@/lib/utils';

type CourierPhoneHistoryPanelProps = {
  phone?: string | null;
  className?: string;
  /** Auto-fetch when phone looks valid. */
  autoLoad?: boolean;
  compact?: boolean;
};

function phoneDigits(phone?: string | null): string {
  return (phone ?? '').replace(/\D/g, '');
}

function emptyStats(): OrderCourierStats {
  return { to: 0, co: 0, su: 0, fa: 0, label: 'New', percent: 0 };
}

function mergeCatalog(providers: CourierProviderHistory[]): CourierProviderHistory[] {
  const byId = new Map(providers.map((p) => [p.provider, p]));
  return COURIER_HISTORY_PROVIDER_ORDER.map((id) => {
    const existing = byId.get(id);
    if (existing) return existing;
    return {
      provider: id,
      label: COURIER_HISTORY_PROVIDER_LABEL[id],
      connected: false,
      available: false,
      status: 'soon' as const,
      countsAvailable: false,
      stats: emptyStats(),
      error: 'Coming soon',
    };
  });
}

export function CourierPhoneHistoryPanel({
  phone,
  className,
  autoLoad = true,
  compact,
}: CourierPhoneHistoryPanelProps) {
  const [data, setData] = React.useState<CourierPhoneHistory | null>(null);
  const [loading, setLoading] = React.useState(false);
  const safePhone = phone ?? '';
  const hasValidPhone = phoneDigits(safePhone).length >= 10;

  const load = React.useCallback(
    async (refresh = false) => {
      const trimmed = (phone ?? '').trim();
      if (phoneDigits(trimmed).length < 10) {
        setData(null);
        return;
      }
      setLoading(true);
      try {
        const next = refresh
          ? await courierPhoneHistoryApi.refresh(trimmed)
          : await courierPhoneHistoryApi.check(trimmed, false);
        setData(next);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Courier history failed');
      } finally {
        setLoading(false);
      }
    },
    [phone],
  );

  React.useEffect(() => {
    if (!autoLoad) return;
    const t = window.setTimeout(() => void load(false), 400);
    return () => window.clearTimeout(t);
  }, [autoLoad, load]);

  const rows = data ? mergeCatalog(data.providers) : null;
  const aggregate = data?.aggregate ?? emptyStats();

  return (
    <div className={cn('space-y-3 rounded-lg border bg-muted/20 p-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Courier success rate</p>
          <p className="text-[11px] text-muted-foreground">
            Network history by phone · more couriers coming soon
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={loading || !hasValidPhone}
          onClick={() => void load(true)}
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {!hasValidPhone ? (
        <p className="text-xs text-muted-foreground">Enter a valid phone to load history.</p>
      ) : loading && !data ? (
        <p className="text-xs text-muted-foreground">Loading courier history…</p>
      ) : (
        <div
          className={cn(
            'grid gap-3',
            compact ? 'lg:grid-cols-[1.4fr_0.8fr]' : 'lg:grid-cols-[1.35fr_0.85fr]',
          )}
        >
          <div className="space-y-2">
            <div className="grid grid-cols-[5.5rem_1fr] gap-2 border-b pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Courier</span>
              <span>Score</span>
            </div>
            {(rows ?? COURIER_HISTORY_PROVIDER_ORDER.map((id) => placeholderRow(id))).map(
              (p) => (
                <CourierScoreRow key={p.provider} provider={p} />
              ),
            )}
            <p className="text-[10px] text-muted-foreground">
              NB: Shop CRM counts are separate (above). Network rows fill as each courier is
              connected.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-background p-3">
            <Donut percent={aggregate.percent} />
            <div className="text-center text-xs">
              <p className="font-semibold">All (network)</p>
              <p className="tabular-nums text-muted-foreground">
                Total: {aggregate.to} · Success: {aggregate.su} · Failed: {aggregate.fa}
              </p>
              {data ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Updated {new Date(data.fetchedAt).toLocaleString()} · {data.source}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function placeholderRow(id: CourierHistoryProviderId): CourierProviderHistory {
  return {
    provider: id,
    label: COURIER_HISTORY_PROVIDER_LABEL[id],
    connected: false,
    available: false,
    status: 'soon',
    countsAvailable: false,
    stats: emptyStats(),
    error: 'Coming soon',
  };
}

function CourierScoreRow({ provider }: { provider: CourierProviderHistory }) {
  const stats = provider.stats ?? emptyStats();
  const status = provider.status ?? (provider.available ? 'ready' : 'soon');
  const showBar = provider.countsAvailable && stats.to > 0;
  const percent = showBar ? Math.min(100, Math.max(0, stats.percent)) : 0;

  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
      <p className="truncate text-xs font-medium">{provider.label}</p>
      <div className="min-w-0 space-y-0.5">
        <div
          className={cn(
            'relative h-5 w-full overflow-hidden rounded-sm border border-border',
            showBar ? 'bg-muted' : 'bg-muted/40',
          )}
        >
          {showBar ? (
            <>
              <div
                className="absolute inset-y-0 left-0 bg-primary"
                style={{ width: `${percent}%` }}
              />
              {percent < 100 ? (
                <div
                  className="absolute inset-y-0 bg-destructive/80"
                  style={{ left: `${percent}%`, right: 0 }}
                />
              ) : null}
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-white drop-shadow-sm">
                {percent}%
              </span>
            </>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
              {status === 'soon'
                ? 'Coming soon'
                : status === 'unavailable'
                  ? 'Unavailable'
                  : provider.rating
                    ? provider.rating
                    : 'No data'}
            </span>
          )}
        </div>
        <p className="text-[10px] tabular-nums text-muted-foreground">
          To: {showBar ? stats.to : 0} ·{' '}
          <span className="text-primary">Su: {showBar ? stats.su : 0}</span> ·{' '}
          <span className="text-destructive">Fa: {showBar ? stats.fa : 0}</span>
        </p>
      </div>
    </div>
  );
}

function Donut({ percent }: { percent: number }) {
  const p = Math.min(100, Math.max(0, percent));
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;

  return (
    <div className="relative size-28">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          className="stroke-muted"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          className="stroke-primary transition-[stroke-dashoffset]"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tabular-nums">{p}%</span>
      </div>
    </div>
  );
}
