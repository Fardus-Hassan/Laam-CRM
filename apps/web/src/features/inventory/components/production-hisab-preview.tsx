'use client';

import type { ComponentType } from 'react';
import { Fragment } from 'react';
import type { ProductionPreviewResult } from '@laam/types';
import { AlertTriangle, CheckCircle2, Package, Scale } from 'lucide-react';

import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { displayPackGrams } from '@/features/inventory/lib/production-pack-size';

type ProductionHisabPreviewProps = {
  preview: ProductionPreviewResult;
  finishedProductName?: string;
  warehouseName?: string;
  recipeName?: string;
  className?: string;
};

export function ProductionHisabPreview({
  preview,
  finishedProductName,
  warehouseName,
  recipeName,
  className,
}: ProductionHisabPreviewProps) {
  if (!preview.ok) {
    return (
      <div
        className={cn(
          'rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2',
          className,
        )}
      >
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Cannot save this batch</p>
            <p className="mt-0.5 text-xs opacity-90">{preview.limitedBy}</p>
          </div>
        </div>
      </div>
    );
  }

  const contextParts = [
    finishedProductName,
    warehouseName,
    recipeName ? `Recipe: ${recipeName}` : null,
  ].filter(Boolean);

  return (
    <div
      className={cn('space-y-3 rounded-md border border-border/80 bg-muted/15 p-3', className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
            <p className="text-sm font-semibold tracking-tight">Review cost before save</p>
          </div>
          {contextParts.length > 0 ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {contextParts.join(' · ')}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3 text-right text-xs">
          <div>
            <p className="text-[10px] text-muted-foreground">Units</p>
            <p className="font-semibold tabular-nums">{preview.unitsProduced}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="font-semibold tabular-nums text-primary">
              {formatCurrency(preview.materialCost)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Avg / unit</p>
            <p className="font-semibold tabular-nums">{formatCurrency(preview.costPerUnit)}</p>
          </div>
        </div>
      </div>

      <section>
        <SectionTitle icon={Scale} title="Raw materials" />
        <div className="overflow-x-auto rounded-md border border-border/70 bg-background/60">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-[11px] text-muted-foreground">
                <th className="px-2.5 py-1.5 font-medium">Material</th>
                <th className="px-2.5 py-1.5 font-medium">Qty</th>
                <th className="px-2.5 py-1.5 font-medium">Rate</th>
                <th className="px-2.5 py-1.5 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {(preview.inputs ?? []).map((input, i) => (
                <tr key={`${input.name}-${i}`} className="border-b border-border/40">
                  <td className="px-2.5 py-1.5 font-medium">{input.name}</td>
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
              <tr className="bg-muted/25 font-semibold">
                <td className="px-2.5 py-1.5" colSpan={3}>
                  Total
                </td>
                <td className="px-2.5 py-1.5 text-right tabular-nums text-primary">
                  {formatCurrency(preview.materialCost)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle icon={Package} title="Cost per pack" />
        <div className="overflow-x-auto rounded-md border border-border/70 bg-background/60">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-[11px] text-muted-foreground">
                <th className="px-2.5 py-1.5 font-medium">Pack</th>
                <th className="px-2.5 py-1.5 font-medium">Qty</th>
                <th className="px-2.5 py-1.5 font-medium">Cost / unit</th>
                <th className="px-2.5 py-1.5 text-right font-medium">Batch share</th>
              </tr>
            </thead>
            <tbody>
              {(preview.outputs ?? []).map((o) => (
                <Fragment key={o.variantId}>
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
                        {o.rawUsage
                          .map(
                            (u) =>
                              `${u.name} ${u.quantityPerUnit}${u.unit} (${formatCurrency(u.costPerUnit)})`,
                          )
                          .join(' · ')}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({
  title,
  icon: Icon,
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {Icon ? <Icon className="size-3.5" /> : null}
      {title}
    </p>
  );
}
