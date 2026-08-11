'use client';

import * as React from 'react';
import type { ProductionBatchResult } from '@laam/types';
import { ChevronDown, ChevronRight, Package, Scale } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ORDER_CARD_CLASS,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { displayPackGrams } from '@/features/inventory/lib/production-pack-size';

function formatDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function groupByDate(runs: ProductionBatchResult[]) {
  const map = new Map<string, ProductionBatchResult[]>();
  for (const run of runs) {
    const key = formatDateKey(run.createdAt);
    const list = map.get(key) ?? [];
    list.push(run);
    map.set(key, list);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

type ProductionLedgerProps = {
  runs: ProductionBatchResult[];
  /** Full matching total when the ledger is paginated. */
  total?: number;
  className?: string;
  onVoid?: (run: ProductionBatchResult) => void | Promise<void>;
  voidingId?: string | null;
};

export function ProductionLedger({
  runs,
  total,
  className,
  onVoid,
  voidingId,
}: ProductionLedgerProps) {
  const [openId, setOpenId] = React.useState<string | null>(runs[0]?.id ?? null);
  const groups = React.useMemo(() => groupByDate(runs), [runs]);

  React.useEffect(() => {
    if (runs[0] && !runs.some((r) => r.id === openId)) {
      setOpenId(runs[0].id);
    }
  }, [runs, openId]);

  if (!runs.length) {
    return (
      <Card className={cn(ORDER_CARD_CLASS, className)}>
        <CardContent className="p-5 text-center text-sm text-muted-foreground">
          No production yet. Saved batches will appear here with material and pack cost.
        </CardContent>
      </Card>
    );
  }

  const totalCost = runs.reduce((s, r) => s + r.materialCost, 0);
  const totalUnits = runs.reduce((s, r) => s + r.unitsProduced, 0);
  const batchLabel =
    typeof total === 'number' && total > runs.length
      ? `${runs.length}/${total}`
      : String(runs.length);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Production (ledger)</h3>
          <p className="text-xs text-muted-foreground">Materials · pack cost · batch total</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>
            Batches: <strong className="text-foreground">{batchLabel}</strong>
          </span>
          <span>
            Units: <strong className="text-foreground">{totalUnits}</strong>
          </span>
          <span>
            Total: <strong className="text-foreground">{formatCurrency(totalCost)}</strong>
          </span>
        </div>
      </div>

      {groups.map(([dateKey, dayRuns]) => {
        const dayCost = dayRuns.reduce((s, r) => s + r.materialCost, 0);
        const dayUnits = dayRuns.reduce((s, r) => s + r.unitsProduced, 0);
        return (
          <div key={dateKey} className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{formatDateLabel(dateKey)}</p>
              <p className="text-xs text-muted-foreground">
                {dayRuns.length} batch · {dayUnits} units · {formatCurrency(dayCost)}
              </p>
            </div>

            <div className="space-y-1.5">
              {dayRuns.map((run) => {
                const open = openId === run.id;
                return (
                  <Card key={run.id} className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
                    <button
                      type="button"
                      className={cn(
                        ORDER_SECTION_HEADER_CLASS,
                        'flex w-full items-start gap-2 py-2.5 text-left hover:bg-muted/40',
                      )}
                      onClick={() => setOpenId(open ? null : run.id)}
                    >
                      {open ? (
                        <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold">{run.batchNumber}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(run.createdAt)}
                          </span>
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            {run.unitsProduced} units
                          </Badge>
                          {run.voidedAt ? (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                              Voided
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-sm font-medium">{run.outputProductName}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {(run.inputs ?? [])
                            .map((i) => `${i.name} ${i.quantity}${i.unit}`)
                            .join(' + ') || '—'}
                          {' · '}
                          {(run.outputs ?? [])
                            .map((o) => `${o.units}×${o.variantLabel}`)
                            .join(' · ') || '—'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums">
                          {formatCurrency(run.materialCost)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatCurrency(run.costPerUnit)}/unit avg
                        </p>
                      </div>
                    </button>

                    {open ? (
                      <CardContent
                        className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3 border-t py-3')}
                      >
                        <div>
                          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Scale className="size-3.5" />
                            Raw materials
                          </p>
                          <div className="overflow-x-auto rounded-md border">
                            <table className="w-full min-w-[420px] text-sm">
                              <thead>
                                <tr className="border-b bg-muted/30 text-left text-[11px] text-muted-foreground">
                                  <th className="px-2.5 py-1.5 font-medium">Material</th>
                                  <th className="px-2.5 py-1.5 font-medium">Qty</th>
                                  <th className="px-2.5 py-1.5 font-medium">Rate</th>
                                  <th className="px-2.5 py-1.5 text-right font-medium">Cost</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(run.inputs ?? []).map((input, i) => (
                                  <tr
                                    key={`${input.name}-${i}`}
                                    className="border-b border-border/40"
                                  >
                                    <td className="px-2.5 py-1.5">
                                      <span className="font-medium">{input.name}</span>
                                      {input.sku ? (
                                        <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                                          {input.sku}
                                        </span>
                                      ) : null}
                                    </td>
                                    <td className="px-2.5 py-1.5 tabular-nums">
                                      {input.quantity} {input.unit}
                                    </td>
                                    <td className="px-2.5 py-1.5 tabular-nums text-muted-foreground">
                                      {formatCurrency(input.costPerKg)}/{input.unit}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-right font-medium tabular-nums">
                                      {formatCurrency(input.totalCost)}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-muted/20 font-semibold">
                                  <td className="px-2.5 py-1.5" colSpan={3}>
                                    Total
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right tabular-nums text-primary">
                                    {formatCurrency(run.materialCost)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div>
                          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Package className="size-3.5" />
                            Cost per pack
                          </p>
                          <div className="overflow-x-auto rounded-md border">
                            <table className="w-full min-w-[420px] text-sm">
                              <thead>
                                <tr className="border-b bg-muted/30 text-left text-[11px] text-muted-foreground">
                                  <th className="px-2.5 py-1.5 font-medium">Pack</th>
                                  <th className="px-2.5 py-1.5 font-medium">Qty</th>
                                  <th className="px-2.5 py-1.5 font-medium">Cost / unit</th>
                                  <th className="px-2.5 py-1.5 text-right font-medium">
                                    Batch share
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(run.outputs ?? []).map((o) => (
                                  <React.Fragment key={o.variantId}>
                                    <tr className="border-b border-border/40">
                                      <td className="px-2.5 py-1.5 font-medium">
                                        {o.variantLabel}{' '}
                                        <span className="text-[11px] font-normal text-muted-foreground">
                                          ({displayPackGrams(o.variantLabel, o.gramsPerUnit)}g)
                                        </span>
                                      </td>
                                      <td className="px-2.5 py-1.5 tabular-nums">{o.units}</td>
                                      <td className="px-2.5 py-1.5 tabular-nums">
                                        {formatCurrency(o.costPerUnit)}
                                      </td>
                                      <td className="px-2.5 py-1.5 text-right font-medium tabular-nums text-primary">
                                        {formatCurrency(o.cost)}
                                      </td>
                                    </tr>
                                    {(o.rawUsage?.length ?? 0) > 0 ? (
                                      <tr className="border-b border-border/30 bg-muted/10">
                                        <td
                                          colSpan={4}
                                          className="px-2.5 py-1 text-[11px] leading-relaxed text-muted-foreground"
                                        >
                                          {(o.rawUsage ?? [])
                                            .map(
                                              (u) =>
                                                `${u.name} ${u.quantityPerUnit}${u.unit} (${formatCurrency(u.costPerUnit)})`,
                                            )
                                            .join(' · ')}
                                        </td>
                                      </tr>
                                    ) : null}
                                  </React.Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {run.note ? (
                          <p className="text-[11px] text-muted-foreground">Note: {run.note}</p>
                        ) : null}

                        {run.voidedAt ? (
                          <p className="text-[11px] text-muted-foreground">
                            Voided{run.voidedByName ? ` by ${run.voidedByName}` : ''} ·{' '}
                            {formatTime(run.voidedAt)}
                          </p>
                        ) : onVoid ? (
                          <div className="flex justify-end border-t border-border/50 pt-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              disabled={voidingId === run.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void onVoid(run);
                              }}
                            >
                              {voidingId === run.id ? 'Voiding…' : 'Void batch'}
                            </Button>
                          </div>
                        ) : null}
                      </CardContent>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
