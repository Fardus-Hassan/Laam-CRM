'use client';

import * as React from 'react';
import type { CourierPhoneHistory, CourierProviderHistory } from '@laam/types';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { DataTableCourierStats } from '@/components/data-table/cells';
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

  return (
    <div className={cn('space-y-3 rounded-lg border bg-muted/20 p-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Courier success rate</p>
          <p className="text-[11px] text-muted-foreground">
            Lifetime network history by phone (Pathao / connected couriers)
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

      {data ? (
        <>
          <DataTableCourierStats courier={data.aggregate} compact={compact} />
          <div className="space-y-1.5">
            {data.providers.map((p) => (
              <ProviderRow key={p.provider} provider={p} />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Updated {new Date(data.fetchedAt).toLocaleString()} · {data.source}
            {data.stale ? ' (stale)' : ''}
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          {loading
            ? 'Loading courier history…'
            : hasValidPhone
              ? 'No history loaded yet — click Refresh.'
              : 'Enter a valid phone to load history.'}
        </p>
      )}
    </div>
  );
}

function ProviderRow({ provider }: { provider: CourierProviderHistory }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs">
      <div className="min-w-0">
        <p className="font-medium">{provider.label}</p>
        {!provider.connected ? (
          <p className="text-muted-foreground">Not connected</p>
        ) : provider.error ? (
          <p className="text-destructive">{provider.error}</p>
        ) : provider.countsAvailable && provider.stats ? (
          <p className="tabular-nums text-muted-foreground">
            To {provider.stats.to} · Su {provider.stats.su} · Fa {provider.stats.fa} ·{' '}
            {provider.stats.percent}%
          </p>
        ) : provider.rating ? (
          <p className="text-muted-foreground">Rating: {provider.rating}</p>
        ) : (
          <p className="text-muted-foreground">No counts</p>
        )}
      </div>
      {provider.riskLevel ? (
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
            provider.riskLevel === 'high' && 'bg-destructive/15 text-destructive',
            provider.riskLevel === 'medium' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
            provider.riskLevel === 'low' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
          )}
        >
          {provider.riskLevel}
        </span>
      ) : null}
    </div>
  );
}
