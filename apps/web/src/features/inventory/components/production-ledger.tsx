'use client';

import * as React from 'react';
import type { ProductionBatchResult } from '@laam/types';
import { ChevronDown, ChevronRight, Package, Scale } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ORDER_CARD_CLASS,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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
  className?: string;
};

export function ProductionLedger({ runs, className }: ProductionLedgerProps) {
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
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No production yet. Add each raw material (qty, unit, cost), variants made — full hisab
          appears here for accounting.
        </CardContent>
      </Card>
    );
  }

  const totalCost = runs.reduce((s, r) => s + r.materialCost, 0);
  const totalUnits = runs.reduce((s, r) => s + r.unitsProduced, 0);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Production hisab (ledger)</h3>
          <p className="text-xs text-muted-foreground">
            Date · each raw material cost · variants · cost per product · per-product raw usage.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>
            Batches: <strong className="text-foreground">{runs.length}</strong>
          </span>
          <span>
            Units: <strong className="text-foreground">{totalUnits}</strong>
          </span>
          <span>
            Total cost: <strong className="text-foreground">{formatCurrency(totalCost)}</strong>
          </span>
        </div>
      </div>

      {groups.map(([dateKey, dayRuns]) => {
        const dayCost = dayRuns.reduce((s, r) => s + r.materialCost, 0);
        const dayUnits = dayRuns.reduce((s, r) => s + r.unitsProduced, 0);
        return (
          <div key={dateKey} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{formatDateLabel(dateKey)}</p>
              <p className="text-xs text-muted-foreground">
                {dayRuns.length} batch · {dayUnits} units · {formatCurrency(dayCost)}
              </p>
            </div>

            <div className="space-y-2">
              {dayRuns.map((run) => {
                const open = openId === run.id;
                return (
                  <Card key={run.id} className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
                    <button
                      type="button"
                      className={cn(
                        ORDER_SECTION_HEADER_CLASS,
                        'flex w-full items-start gap-2 text-left hover:bg-muted/40',
                      )}
                      onClick={() => setOpenId(open ? null : run.id)}
                    >
                      {open ? (
                        <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold">{run.batchNumber}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(run.createdAt)}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {run.unitsProduced} units
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-sm font-medium">{run.outputProductName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {(run.inputs ?? [])
                            .map((i) => `${i.name} ${i.quantity}${i.unit}`)
                            .join(' + ') || '—'}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
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
                          {formatCurrency(run.costPerUnit)}/product
                        </p>
                      </div>
                    </button>

                    {open ? (
                      <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4 border-t')}>
                        {/* Each raw separate */}
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <Scale className="size-3.5" />
                            Raw materials (each line separate)
                          </p>
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full min-w-[480px] text-sm">
                              <thead>
                                <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                                  <th className="px-3 py-2 font-medium">Material</th>
                                  <th className="px-3 py-2 font-medium">Qty</th>
                                  <th className="px-3 py-2 font-medium">৳ / kg</th>
                                  <th className="px-3 py-2 text-right font-medium">Line cost</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(run.inputs ?? []).map((input, i) => (
                                  <tr key={`${input.name}-${i}`} className="border-b border-border/50">
                                    <td className="px-3 py-2">
                                      <p className="font-medium">{input.name}</p>
                                      {input.sku ? (
                                        <p className="font-mono text-[11px] text-muted-foreground">
                                          {input.sku}
                                        </p>
                                      ) : null}
                                    </td>
                                    <td className="px-3 py-2 tabular-nums">
                                      {input.quantity} {input.unit}
                                    </td>
                                    <td className="px-3 py-2 tabular-nums">
                                      {formatCurrency(input.costPerKg)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                                      {formatCurrency(input.totalCost)}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-muted/20 font-semibold">
                                  <td className="px-3 py-2" colSpan={3}>
                                    Total production cost
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums">
                                    {formatCurrency(run.materialCost)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Per product raw usage */}
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Per product — each raw how much
                          </p>
                          <div className="mb-2 flex flex-wrap gap-3 text-sm">
                            <span>
                              Cost per product:{' '}
                              <strong>{formatCurrency(run.costPerUnit)}</strong>
                            </span>
                            <span className="text-muted-foreground">
                              ({run.unitsProduced} units)
                            </span>
                          </div>
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full min-w-[400px] text-sm">
                              <thead>
                                <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                                  <th className="px-3 py-2 font-medium">Raw material</th>
                                  <th className="px-3 py-2 font-medium">Qty / product</th>
                                  <th className="px-3 py-2 text-right font-medium">৳ / product</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(run.perUnitRawUsage ?? []).map((u, i) => (
                                  <tr key={`${u.name}-${i}`} className="border-b border-border/50">
                                    <td className="px-3 py-2 font-medium">{u.name}</td>
                                    <td className="px-3 py-2 tabular-nums">
                                      {u.quantityPerUnit} {u.unit}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {formatCurrency(u.costPerUnit)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Variants */}
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <Package className="size-3.5" />
                            Variants made (weight share)
                          </p>
                          <div className="space-y-2">
                            {(run.outputs ?? []).map((o) => (
                              <div key={o.variantId} className="rounded-lg border p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-medium">
                                    {o.units}× {o.variantLabel}{' '}
                                    <span className="text-xs text-muted-foreground">
                                      ({o.gramsPerUnit}g)
                                    </span>
                                  </p>
                                  <span className="text-xs font-medium tabular-nums">
                                    {formatCurrency(o.costPerUnit)}/unit · batch{' '}
                                    {formatCurrency(o.cost)}
                                  </span>
                                </div>
                                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                                  {(o.rawUsage ?? []).map((u, i) => (
                                    <li key={`${o.variantId}-${u.name}-${i}`}>
                                      {u.name}: {u.quantityPerUnit} {u.unit} ·{' '}
                                      {formatCurrency(u.costPerUnit)}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Accounting:</span> batch{' '}
                          <span className="font-mono">{run.batchNumber}</span> · total material{' '}
                          {formatCurrency(run.materialCost)} · avg{' '}
                          {formatCurrency(run.costPerUnit)}/product · journal raw → finished goods.
                          {run.note ? (
                            <span className="mt-1 block">Note: {run.note}</span>
                          ) : null}
                        </div>
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
