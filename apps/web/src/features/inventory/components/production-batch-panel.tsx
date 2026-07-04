'use client';

import * as React from 'react';
import type { InventoryProductListItem, ProductionBatchResult } from '@laam/types';
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

type ExtraRow = { key: string; productId: string; qtyPerUnit: string };

type ProductionBatchPanelProps = {
  onCompleted?: (result: ProductionBatchResult) => void;
};

export function ProductionBatchPanel({ onCompleted }: ProductionBatchPanelProps) {
  const [products, setProducts] = React.useState<InventoryProductListItem[]>([]);
  const [outputProductId, setOutputProductId] = React.useState('');
  const [primaryProductId, setPrimaryProductId] = React.useState('');
  const [totalAmount, setTotalAmount] = React.useState('10');
  const [amountUnit, setAmountUnit] = React.useState<'kg' | 'g'>('kg');
  const [gramsPerUnit, setGramsPerUnit] = React.useState('500');
  const [gramsPerStockUnit, setGramsPerStockUnit] = React.useState('1000');
  const [unitsOverride, setUnitsOverride] = React.useState('');
  const [extras, setExtras] = React.useState<ExtraRow[]>([]);
  const [note, setNote] = React.useState('');
  const [running, setRunning] = React.useState(false);
  const [preview, setPreview] = React.useState<{
    maxUnits: number;
    usedGrams: number;
    leftoverGrams: number;
    materialCost: number;
    costPerUnit: number;
    limitedBy: string;
  } | null>(null);

  React.useEffect(() => {
    void inventoryApi
      .listProducts({ page: 1, pageSize: 100, filter: 'active' })
      .then((r) => setProducts(r.items));
  }, []);

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.sku} — ${p.name} (stock ${p.stock})`,
  }));

  const totalGrams = React.useMemo(() => {
    const n = Number(totalAmount);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return amountUnit === 'kg' ? n * 1000 : n;
  }, [totalAmount, amountUnit]);

  const payload = React.useMemo(() => {
    if (!outputProductId || !primaryProductId || totalGrams <= 0 || Number(gramsPerUnit) <= 0) {
      return null;
    }
    return {
      outputProductId,
      gramsPerUnit: Number(gramsPerUnit),
      primaryInput: {
        productId: primaryProductId,
        totalGrams,
        gramsPerStockUnit: Number(gramsPerStockUnit) || 1000,
      },
      extraInputs: extras
        .filter((e) => e.productId && Number(e.qtyPerUnit) > 0)
        .map((e) => ({ productId: e.productId, qtyPerUnit: Number(e.qtyPerUnit) })),
      unitsToProduce: unitsOverride ? Number(unitsOverride) : undefined,
      note: note || undefined,
    };
  }, [
    outputProductId,
    primaryProductId,
    totalGrams,
    gramsPerUnit,
    gramsPerStockUnit,
    extras,
    unitsOverride,
    note,
  ]);

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
    if (!payload || !preview || preview.maxUnits <= 0) {
      toast.error('Enter materials and grams per product first');
      return;
    }
    setRunning(true);
    try {
      const result = await inventoryApi.runProduction(payload);
      toast.success(
        `Made ${result.unitsProduced}× ${result.outputProductName} — cost ${formatCurrency(result.costPerUnit)}/unit`,
      );
      onCompleted?.(result);
      setUnitsOverride('');
      setNote('');
      const refreshed = await inventoryApi.listProducts({ page: 1, pageSize: 100, filter: 'active' });
      setProducts(refreshed.items);
      if (payload) {
        setPreview(await inventoryApi.previewProduction(payload));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Production failed');
    } finally {
      setRunning(false);
    }
  }

  const primary = products.find((p) => p.id === primaryProductId);
  const stockUnitsNeeded = preview
    ? Math.ceil(preview.usedGrams / (Number(gramsPerStockUnit) || 1000))
    : 0;

  return (
    <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <div className="flex items-start gap-2">
          <Calculator className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <CardTitle className="text-sm">Batch production calculator</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Enter bulk raw material (kg/g), set grams per finished product — system calculates how many units you can make, leftover, and cost.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Finished product (output)" required>
            <FormSearchSelect
              value={outputProductId}
              onChange={setOutputProductId}
              options={productOptions}
              placeholder="e.g. Modhu 500g jar…"
            />
          </FormField>
          <FormField label="Primary raw material" required>
            <FormSearchSelect
              value={primaryProductId}
              onChange={setPrimaryProductId}
              options={productOptions}
              placeholder="e.g. Bulk modhu / honey…"
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Total material in batch" required>
            <div className="flex gap-2">
              <FormInput
                type="number"
                min={0}
                step="any"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="min-w-0 flex-1"
              />
              <div className="flex shrink-0 rounded-md border">
                {(['kg', 'g'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={cn(
                      'px-2.5 text-xs font-medium',
                      amountUnit === u ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                    )}
                    onClick={() => setAmountUnit(u)}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">= {totalGrams.toLocaleString()} g</p>
          </FormField>

          <FormField label="Grams per product" required>
            <FormInput
              type="number"
              min={1}
              value={gramsPerUnit}
              onChange={(e) => setGramsPerUnit(e.target.value)}
              placeholder="500"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">e.g. 500g jar, 250g pouch</p>
          </FormField>

          <FormField label="Stock unit weight (g)">
            <FormInput
              type="number"
              min={1}
              value={gramsPerStockUnit}
              onChange={(e) => setGramsPerStockUnit(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              1000 = stock counted in kg{primary ? ` · have ${primary.stock}` : ''}
            </p>
          </FormField>

          <FormField label="Units to make (optional)">
            <FormInput
              type="number"
              min={1}
              value={unitsOverride}
              onChange={(e) => setUnitsOverride(e.target.value)}
              placeholder={preview ? `Max ${preview.maxUnits}` : 'Auto'}
            />
          </FormField>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Extra materials (jar, box, ribbon…)</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              onClick={() =>
                setExtras((rows) => [
                  ...rows,
                  { key: `x-${Date.now()}`, productId: '', qtyPerUnit: '1' },
                ])
              }
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
          {extras.map((row) => (
            <div key={row.key} className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
              <FormSearchSelect
                value={row.productId}
                onChange={(v) =>
                  setExtras((rows) => rows.map((r) => (r.key === row.key ? { ...r, productId: v } : r)))
                }
                options={productOptions}
                placeholder="Packaging product…"
              />
              <FormInput
                type="number"
                min={0.1}
                step="any"
                value={row.qtyPerUnit}
                onChange={(e) =>
                  setExtras((rows) =>
                    rows.map((r) => (r.key === row.key ? { ...r, qtyPerUnit: e.target.value } : r)),
                  )
                }
                placeholder="Per unit"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="shrink-0"
                onClick={() => setExtras((rows) => rows.filter((r) => r.key !== row.key))}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <FormField label="Note">
          <FormInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional batch note" />
        </FormField>

        {preview && preview.maxUnits > 0 ? (
          <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-3 sm:p-4 lg:grid-cols-4">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Products you can make</p>
              <p className="text-xl font-bold tabular-nums text-primary sm:text-2xl">{preview.maxUnits}</p>
              <p className="truncate text-[11px] text-muted-foreground">Limited by {preview.limitedBy}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Material used</p>
              <p className="text-base font-semibold tabular-nums sm:text-lg">
                {preview.usedGrams.toLocaleString()} g
              </p>
              <p className="text-[11px] text-muted-foreground">
                Leftover {preview.leftoverGrams.toLocaleString()} g
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Cost per unit</p>
              <p className="truncate text-base font-semibold tabular-nums sm:text-lg">
                {formatCurrency(preview.costPerUnit)}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Total {formatCurrency(preview.materialCost)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Stock to deduct</p>
              <p className="text-base font-semibold tabular-nums sm:text-lg">{stockUnitsNeeded} units</p>
              {primary && primary.stock < stockUnitsNeeded ? (
                <Badge variant="destructive" className="mt-1 max-w-full truncate">
                  Need {stockUnitsNeeded}, have {primary.stock}
                </Badge>
              ) : (
                <p className="text-[11px] text-emerald-600">Stock OK</p>
              )}
            </div>
          </div>
        ) : payload ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Not enough material for even 1 product — check grams and stock.
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={running || !preview || preview.maxUnits <= 0}
            onClick={() => void handleRun()}
          >
            {running ? 'Running…' : 'Run production'}
          </Button>
          <p className="text-center text-xs text-muted-foreground sm:text-left">
            Deducts raw stock, adds finished goods, posts inventory journal in Accounting.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
