'use client';

import * as React from 'react';
import type {
  InventoryProductDetail,
  InventoryProductListItem,
  ProductionBatchResult,
  ProductVariant,
} from '@laam/types';
import { Calculator, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import {
  ORDER_CARD_CLASS,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type RawRow = {
  key: string;
  productId: string;
  name: string;
  quantity: string;
  unit: 'kg' | 'g';
  totalCost: string;
  costPerKg: string;
};

type VariantPlan = {
  variantId: string;
  variantLabel: string;
  gramsPerUnit: string;
  units: string;
};

type ProductionBatchPanelProps = {
  onCompleted?: (result: ProductionBatchResult) => void;
};

export function parseGramsFromLabel(label: string): number {
  const kg = label.match(/([\d.]+)\s*kg/i);
  if (kg) return Math.round(parseFloat(kg[1]) * 1000);
  const g = label.match(/([\d.]+)\s*g/i);
  if (g) return Math.round(parseFloat(g[1]));
  return 500;
}

function plansFromVariants(variants: ProductVariant[]): VariantPlan[] {
  return variants.map((v) => ({
    variantId: v.id,
    variantLabel: v.label,
    gramsPerUnit: String(parseGramsFromLabel(v.label)),
    units: '',
  }));
}

function emptyRawRow(): RawRow {
  return {
    key: `raw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: '',
    name: '',
    quantity: '',
    unit: 'kg',
    totalCost: '',
    costPerKg: '',
  };
}

function qtyToKg(quantity: number, unit: 'kg' | 'g') {
  return unit === 'kg' ? quantity : quantity / 1000;
}

export function ProductionBatchPanel({ onCompleted }: ProductionBatchPanelProps) {
  const [products, setProducts] = React.useState<InventoryProductListItem[]>([]);
  const [outputDetail, setOutputDetail] = React.useState<InventoryProductDetail | null>(null);
  const [outputProductId, setOutputProductId] = React.useState('');
  const [rawRows, setRawRows] = React.useState<RawRow[]>([emptyRawRow(), emptyRawRow()]);
  const [variantPlans, setVariantPlans] = React.useState<VariantPlan[]>([]);
  const [note, setNote] = React.useState('');
  const [running, setRunning] = React.useState(false);
  const [preview, setPreview] = React.useState<Awaited<
    ReturnType<typeof inventoryApi.previewProduction>
  > | null>(null);

  React.useEffect(() => {
    void inventoryApi.listProducts({ page: 1, pageSize: 100, filter: 'active' }).then((r) => setProducts(r.items));
  }, []);

  React.useEffect(() => {
    if (!outputProductId) {
      setOutputDetail(null);
      setVariantPlans([]);
      return;
    }
    void inventoryApi.getProduct(outputProductId).then((p) => {
      setOutputDetail(p);
      setVariantPlans(p?.variants?.length ? plansFromVariants(p.variants) : []);
    });
  }, [outputProductId]);

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.sku} — ${p.name} (stock ${p.stock})`,
  }));

  function patchRaw(key: string, patch: Partial<RawRow>, recalc: 'fromTotal' | 'fromRate' | 'none' = 'none') {
    setRawRows((rows) =>
      rows.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        const qty = Number(next.quantity);
        const qtyKg = qtyToKg(qty, next.unit);
        if (recalc === 'fromTotal' && qtyKg > 0 && next.totalCost !== '') {
          const total = Number(next.totalCost);
          if (Number.isFinite(total)) {
            next.costPerKg = String(Math.round((total / qtyKg) * 100) / 100);
          }
        }
        if (recalc === 'fromRate' && qtyKg > 0 && next.costPerKg !== '') {
          const rate = Number(next.costPerKg);
          if (Number.isFinite(rate)) {
            next.totalCost = String(Math.round(rate * qtyKg));
          }
        }
        return next;
      }),
    );
  }

  function onPickMaterial(key: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    patchRaw(key, {
      productId,
      name: product?.name ?? '',
      costPerKg: product?.costPrice != null ? String(product.costPrice) : '',
    }, 'fromRate');
  }

  const payload = React.useMemo(() => {
    if (!outputProductId) return null;
    const rawMaterials = rawRows
      .map((r) => ({
        productId: r.productId || undefined,
        name: r.name.trim() || products.find((p) => p.id === r.productId)?.name || '',
        quantity: Number(r.quantity),
        unit: r.unit,
        totalCost: Number(r.totalCost) || 0,
        costPerKg: Number(r.costPerKg) || 0,
      }))
      .filter((r) => r.name && r.quantity > 0);
    const outputs = variantPlans
      .map((v) => ({
        variantId: v.variantId,
        variantLabel: v.variantLabel,
        gramsPerUnit: Number(v.gramsPerUnit) || 0,
        units: Number(v.units) || 0,
      }))
      .filter((o) => o.units > 0 && o.gramsPerUnit > 0);
    if (!rawMaterials.length || !outputs.length) return null;
    return { outputProductId, rawMaterials, outputs, note: note || undefined };
  }, [outputProductId, rawRows, variantPlans, note, products]);

  React.useEffect(() => {
    if (!payload) {
      setPreview(null);
      return;
    }
    const t = setTimeout(() => {
      void inventoryApi.previewProduction(payload).then(setPreview);
    }, 120);
    return () => clearTimeout(t);
  }, [payload]);

  async function handleRun() {
    if (!payload || !preview?.ok) {
      toast.error(preview?.limitedBy || 'Fill raw materials and variant units');
      return;
    }
    setRunning(true);
    try {
      const result = await inventoryApi.runProduction(payload);
      toast.success(
        `Saved ${result.batchNumber}: ${result.unitsProduced} units · total ${formatCurrency(result.materialCost)} · ${formatCurrency(result.costPerUnit)}/unit`,
      );
      onCompleted?.(result);
      setRawRows([emptyRawRow(), emptyRawRow()]);
      setVariantPlans((plans) => plans.map((p) => ({ ...p, units: '' })));
      setNote('');
      const refreshed = await inventoryApi.listProducts({ page: 1, pageSize: 100, filter: 'active' });
      setProducts(refreshed.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Production failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <div className="flex items-start gap-2">
          <Calculator className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <CardTitle className="text-sm">Production hisab</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Multiple raw materials (each with own qty, unit, cost) → variants made → cost per
              product and per-raw usage.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-5')}>
        <FormField label="Finished product" required>
          <FormSearchSelect
            value={outputProductId}
            onChange={setOutputProductId}
            options={productOptions}
            placeholder="e.g. Honey + Kalojira Mix…"
          />
        </FormField>

        {/* Raw materials */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Raw materials (each line separate)
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              onClick={() => setRawRows((rows) => [...rows, emptyRawRow()])}
            >
              <Plus className="size-3.5" />
              Add material
            </Button>
          </div>

          <div className="space-y-3">
            {rawRows.map((row, index) => (
              <div
                key={row.key}
                className="space-y-2 rounded-xl border bg-muted/10 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Material {index + 1}</p>
                  {rawRows.length > 1 ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive"
                      onClick={() => setRawRows((rows) => rows.filter((r) => r.key !== row.key))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField label="Material">
                    <FormSearchSelect
                      value={row.productId}
                      onChange={(v) => onPickMaterial(row.key, v)}
                      options={productOptions}
                      placeholder="Select or type below…"
                    />
                  </FormField>
                  <FormField label="Name (if not in list)">
                    <FormInput
                      value={row.name}
                      onChange={(e) => patchRaw(row.key, { name: e.target.value })}
                      placeholder="Kalojira / Honey / Jafran"
                    />
                  </FormField>
                  <FormField label="Quantity">
                    <div className="flex gap-1">
                      <FormInput
                        type="number"
                        min={0}
                        step="any"
                        value={row.quantity}
                        onChange={(e) =>
                          patchRaw(row.key, { quantity: e.target.value }, 'fromRate')
                        }
                        className="min-w-0 flex-1"
                      />
                      <div className="flex shrink-0 rounded-md border">
                        {(['kg', 'g'] as const).map((u) => (
                          <button
                            key={u}
                            type="button"
                            className={cn(
                              'px-2 text-xs font-medium',
                              row.unit === u
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted',
                            )}
                            onClick={() => patchRaw(row.key, { unit: u }, 'fromRate')}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </FormField>
                  <FormField label="Total cost (৳)">
                    <FormInput
                      type="number"
                      min={0}
                      value={row.totalCost}
                      onChange={(e) =>
                        patchRaw(row.key, { totalCost: e.target.value }, 'fromTotal')
                      }
                      placeholder="50000"
                    />
                  </FormField>
                </div>
                <FormField label="Cost per kg (৳)">
                  <FormInput
                    type="number"
                    min={0}
                    value={row.costPerKg}
                    onChange={(e) =>
                      patchRaw(row.key, { costPerKg: e.target.value }, 'fromRate')
                    }
                    placeholder="500"
                    className="max-w-xs"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Auto from total ÷ kg; edit either field.
                  </p>
                </FormField>
              </div>
            ))}
          </div>
        </div>

        {/* Variants */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Variants made
          </p>
          {!outputProductId ? (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Select finished product to load variants (500g, 1kg, …).
            </p>
          ) : (
            <div className="space-y-2 rounded-xl border p-3">
              {variantPlans.map((plan) => (
                <div key={plan.variantId} className="grid gap-2 sm:grid-cols-[1fr_6rem_7rem]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{plan.variantLabel}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Stock{' '}
                      {outputDetail?.variants.find((v) => v.id === plan.variantId)?.stock ?? '—'}
                    </p>
                  </div>
                  <FormField label="g / unit">
                    <FormInput
                      type="number"
                      min={1}
                      value={plan.gramsPerUnit}
                      onChange={(e) =>
                        setVariantPlans((rows) =>
                          rows.map((r) =>
                            r.variantId === plan.variantId
                              ? { ...r, gramsPerUnit: e.target.value }
                              : r,
                          ),
                        )
                      }
                    />
                  </FormField>
                  <FormField label="Units made">
                    <FormInput
                      type="number"
                      min={0}
                      value={plan.units}
                      onChange={(e) =>
                        setVariantPlans((rows) =>
                          rows.map((r) =>
                            r.variantId === plan.variantId ? { ...r, units: e.target.value } : r,
                          ),
                        )
                      }
                      placeholder="0"
                    />
                  </FormField>
                </div>
              ))}
            </div>
          )}
        </div>

        <FormField label="Note">
          <FormInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </FormField>

        {/* Preview breakdowns */}
        {preview && preview.unitsProduced > 0 ? (
          <div className="space-y-4 rounded-xl border bg-muted/20 p-3 sm:p-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Each raw material (separate)
              </p>
              <div className="overflow-x-auto rounded-lg border bg-background">
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
                    {preview.inputs.map((input, i) => (
                      <tr key={`${input.name}-${i}`} className="border-b border-border/50">
                        <td className="px-3 py-2 font-medium">{input.name}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {input.quantity} {input.unit}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{formatCurrency(input.costPerKg)}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">
                          {formatCurrency(input.totalCost)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30 font-semibold">
                      <td className="px-3 py-2" colSpan={3}>
                        Total production cost
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(preview.materialCost)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-background p-3">
                <p className="text-[11px] text-muted-foreground">Units made</p>
                <p className="text-xl font-bold tabular-nums text-primary">{preview.unitsProduced}</p>
              </div>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-[11px] text-muted-foreground">Cost per product (avg)</p>
                <p className="text-xl font-bold tabular-nums">
                  {formatCurrency(preview.costPerUnit)}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Per product — each raw how much
              </p>
              <div className="overflow-x-auto rounded-lg border bg-background">
                <table className="w-full min-w-[400px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Raw material</th>
                      <th className="px-3 py-2 font-medium">Qty / product</th>
                      <th className="px-3 py-2 text-right font-medium">৳ / product</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.perUnitRawUsage.map((u, i) => (
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

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Per variant (weight-based share)
              </p>
              <div className="space-y-2">
                {preview.outputs.map((o) => (
                  <div key={o.variantId} className="rounded-lg border bg-background p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {o.units}× {o.variantLabel}{' '}
                        <span className="text-xs text-muted-foreground">({o.gramsPerUnit}g)</span>
                      </p>
                      <Badge variant="outline">
                        {formatCurrency(o.costPerUnit)}/unit · batch {formatCurrency(o.cost)}
                      </Badge>
                    </div>
                    <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {o.rawUsage.map((u, i) => (
                        <li key={`${o.variantId}-${u.name}-${i}`}>
                          {u.name}: {u.quantityPerUnit} {u.unit} · {formatCurrency(u.costPerUnit)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {!preview.ok ? (
              <Badge variant="destructive">{preview.limitedBy}</Badge>
            ) : null}
          </div>
        ) : payload ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            {preview?.limitedBy || 'Fill materials and variant units.'}
          </p>
        ) : null}

        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={running || !preview?.ok}
          onClick={() => void handleRun()}
        >
          {running ? 'Saving…' : 'Save production hisab'}
        </Button>
      </CardContent>
    </Card>
  );
}
