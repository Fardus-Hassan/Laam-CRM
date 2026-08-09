'use client';

import * as React from 'react';
import type {
  InventoryProductDetail,
  InventoryProductListItem,
  MixerRecipeListItem,
  ProductionBatchResult,
  ProductVariant,
  Warehouse,
} from '@laam/types';
import { Calculator, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { ProductionHisabPreview } from '@/features/inventory/components/production-hisab-preview';
import { useInventoryUnits } from '@/features/inventory/hooks/use-inventory-units';
import {
  ORDER_CARD_CLASS,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { gramsFromVariant } from '@/features/inventory/lib/production-pack-size';

type RawRow = {
  key: string;
  productId: string;
  name: string;
  quantity: string;
  unit: string;
  totalCost: string;
  costPerKg: string;
  locked?: boolean;
};

type VariantPlan = {
  variantId: string;
  variantLabel: string;
  gramsPerUnit: string;
  units: string;
};

type ProductionBatchPanelProps = {
  onCompleted?: (result: ProductionBatchResult) => void;
  guideRecipe?: MixerRecipeListItem | null;
  guideNonce?: number;
  recipes?: MixerRecipeListItem[];
};

function normalizeGuideUnit(unit: string): string {
  const u = unit.trim().toLowerCase();
  if (u === 'g' || u === 'gram' || u === 'grams' || u === 'gm') return 'g';
  if (u === 'kg' || u === 'kilogram' || u === 'kilograms') return 'kg';
  if (u === 'l' || u === 'litre' || u === 'liter') return 'L';
  if (u === 'ml') return 'ml';
  if (u === 'pcs' || u === 'pc' || u === 'piece' || u === 'pieces') return 'pcs';
  return unit.trim() || 'kg';
}

function plansFromVariants(variants: ProductVariant[]): VariantPlan[] {
  return variants.map((v) => ({
    variantId: v.id,
    variantLabel: v.label,
    gramsPerUnit: String(gramsFromVariant(v)),
    units: '',
  }));
}

function emptyRawRow(defaultUnit = 'kg'): RawRow {
  return {
    key: `raw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: '',
    name: '',
    quantity: '',
    unit: defaultUnit,
    totalCost: '',
    costPerKg: '',
  };
}

export function ProductionBatchPanel({
  onCompleted,
  guideRecipe,
  guideNonce = 0,
  recipes = [],
}: ProductionBatchPanelProps) {
  const { unitOptions, defaultCode } = useInventoryUnits();
  const [products, setProducts] = React.useState<InventoryProductListItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = React.useState('');
  const [recipeId, setRecipeId] = React.useState('');
  const [outputDetail, setOutputDetail] = React.useState<InventoryProductDetail | null>(null);
  const [outputProductId, setOutputProductId] = React.useState('');
  const [rawRows, setRawRows] = React.useState<RawRow[]>(() => [emptyRawRow('kg')]);
  const [variantPlans, setVariantPlans] = React.useState<VariantPlan[]>([]);
  const [note, setNote] = React.useState('');
  const [running, setRunning] = React.useState(false);
  const [preview, setPreview] = React.useState<Awaited<
    ReturnType<typeof inventoryApi.previewProduction>
  > | null>(null);

  const recipeBase = React.useRef<{
    outputQty: number;
    inputs: Array<{ productId: string; name: string; quantity: number; unit: string; costPerKg: string }>;
  } | null>(null);
  const pendingGuideUnits = React.useRef<number | null>(null);
  const appliedGuideNonce = React.useRef(0);

  React.useEffect(() => {
    void Promise.all([
      inventoryApi.listProducts({ page: 1, pageSize: 200, filter: 'active' }),
      inventoryApi.listWarehouses(),
    ]).then(([productRes, whRes]) => {
      setProducts(productRes.items);
      setWarehouses(whRes.items);
      const def = whRes.items.find((w) => w.isDefault) ?? whRes.items[0];
      if (def) setWarehouseId((prev) => prev || def.id);
    });
  }, []);

  const applyRecipeMaterials = React.useCallback(
    (recipe: MixerRecipeListItem, scale = 1) => {
      const inputs = recipe.inputs
        .filter((input) => input.productId)
        .map((input) => {
          const matched =
            products.find((p) => p.id === input.productId) ??
            products.find((p) => p.sku === input.sku);
          const unit = normalizeGuideUnit(input.unit);
          const qty = Math.round(input.quantity * scale * 1000) / 1000;
          const costPerKg = matched?.costPrice != null ? String(matched.costPrice) : '';
          const totalCost =
            costPerKg && qty > 0 ? String(Math.round(Number(costPerKg) * qty)) : '';
          return {
            key: `raw-${input.productId}-${Math.random().toString(36).slice(2, 6)}`,
            productId: matched?.id ?? input.productId!,
            name: matched?.name ?? input.productName,
            quantity: String(qty),
            unit,
            totalCost,
            costPerKg,
            locked: true,
          } satisfies RawRow;
        });

      recipeBase.current = {
        outputQty: Math.max(1, recipe.outputQty),
        inputs: inputs.map((row) => ({
          productId: row.productId,
          name: row.name,
          quantity: Number(row.quantity) / scale,
          unit: row.unit,
          costPerKg: row.costPerKg,
        })),
      };

      setRecipeId(recipe.id);
      setRawRows(inputs.length ? inputs : [emptyRawRow(defaultCode('kg'))]);
      setNote(recipe.name);
      setPreview(null);
    },
    [products, defaultCode],
  );

  React.useEffect(() => {
    if (!guideRecipe || !guideNonce) return;
    if (!products.length) return;
    if (appliedGuideNonce.current === guideNonce) return;
    appliedGuideNonce.current = guideNonce;

    const matchedOutput =
      products.find((p) => p.id === guideRecipe.outputProductId) ??
      products.find((p) => p.sku === guideRecipe.outputSku);

    pendingGuideUnits.current = guideRecipe.outputQty;
    setOutputProductId(matchedOutput?.id ?? guideRecipe.outputProductId);
    applyRecipeMaterials(guideRecipe, 1);
  }, [guideRecipe, guideNonce, products, applyRecipeMaterials]);

  React.useEffect(() => {
    if (!outputProductId) {
      setOutputDetail(null);
      setVariantPlans([]);
      return;
    }
    void inventoryApi.getProduct(outputProductId).then((p) => {
      setOutputDetail(p);
      const plans = p?.variants?.length ? plansFromVariants(p.variants) : [];
      const guideUnits = pendingGuideUnits.current;
      if (guideUnits != null && plans.length) {
        plans[0] = { ...plans[0], units: String(guideUnits) };
        pendingGuideUnits.current = null;
      }
      setVariantPlans(plans);
    });
  }, [outputProductId]);

  // Scale recipe materials when finished units change.
  const totalUnits = variantPlans.reduce((sum, p) => sum + (Number(p.units) || 0), 0);
  React.useEffect(() => {
    const base = recipeBase.current;
    if (!base || !recipeId || totalUnits <= 0) return;
    const scale = totalUnits / base.outputQty;
    setRawRows((rows) => {
      if (!rows.every((r) => r.locked)) return rows;
      return base.inputs.map((input) => {
        const qty = Math.round(input.quantity * scale * 1000) / 1000;
        const totalCost =
          input.costPerKg && qty > 0
            ? String(Math.round(Number(input.costPerKg) * qty))
            : '';
        return {
          key: `raw-${input.productId}-scaled`,
          productId: input.productId,
          name: input.name,
          quantity: String(qty),
          unit: input.unit,
          totalCost,
          costPerKg: input.costPerKg,
          locked: true,
        };
      });
    });
  }, [totalUnits, recipeId]);

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.sku} — ${p.name}`,
  }));

  const warehouseOptions = warehouses.map((w) => ({
    value: w.id,
    label: `${w.code} — ${w.name}${w.isDefault ? ' (default)' : ''}`,
  }));

  const recipeOptions = [
    { value: '', label: 'Custom mix (no recipe)' },
    ...recipes
      .filter((r) => r.status === 'active' || r.id === recipeId)
      .map((r) => ({
        value: r.id,
        label: `${r.name} → ${r.outputProductName}`,
      })),
  ];

  function onPickRecipe(id: string) {
    setRecipeId(id);
    if (!id) {
      recipeBase.current = null;
      setRawRows([emptyRawRow(defaultCode('kg'))]);
      setNote('');
      return;
    }
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return;
    pendingGuideUnits.current = recipe.outputQty;
    setOutputProductId(recipe.outputProductId);
    applyRecipeMaterials(recipe, 1);
  }

  function patchRaw(key: string, patch: Partial<RawRow>, recalc: 'fromTotal' | 'fromRate' | 'none' = 'none') {
    setRawRows((rows) =>
      rows.map((row) => {
        if (row.key !== key) return row;
        if (row.locked && (patch.productId !== undefined || patch.quantity !== undefined)) {
          // Allow cost edits on locked recipe rows; block material/qty drift.
          if (patch.productId !== undefined || patch.quantity !== undefined || patch.unit !== undefined) {
            const { totalCost, costPerKg, name } = patch;
            patch = { totalCost, costPerKg, name };
          }
        }
        const next = { ...row, ...patch };
        const qty = Number(next.quantity);
        if (recalc === 'fromTotal' && qty > 0 && next.totalCost !== '') {
          const total = Number(next.totalCost);
          if (Number.isFinite(total)) {
            next.costPerKg = String(Math.round((total / qty) * 100) / 100);
          }
        }
        if (recalc === 'fromRate' && qty > 0 && next.costPerKg !== '') {
          const rate = Number(next.costPerKg);
          if (Number.isFinite(rate)) {
            next.totalCost = String(Math.round(rate * qty));
          }
        }
        return next;
      }),
    );
  }

  function onPickMaterial(key: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    const unit = defaultCode(product?.primaryBaseUomCode ?? 'kg');
    patchRaw(
      key,
      {
        productId,
        name: product?.name ?? '',
        unit,
        costPerKg: product?.costPrice != null ? String(product.costPrice) : '',
      },
      'fromRate',
    );
  }

  const payload = React.useMemo(() => {
    if (!outputProductId) return null;
    const rawMaterials = rawRows
      .map((r) => ({
        productId: r.productId,
        name: r.name.trim() || products.find((p) => p.id === r.productId)?.name || '',
        quantity: Number(r.quantity),
        unit: r.unit,
        totalCost: Number(r.totalCost) || 0,
        costPerKg: Number(r.costPerKg) || 0,
      }))
      .filter((r) => r.productId && r.name && r.quantity > 0);
    const outputs = variantPlans
      .map((v) => ({
        variantId: v.variantId,
        variantLabel: v.variantLabel,
        gramsPerUnit: Number(v.gramsPerUnit) || 0,
        units: Number(v.units) || 0,
      }))
      .filter((o) => o.units > 0 && o.gramsPerUnit > 0);
    if (!rawMaterials.length || !outputs.length) return null;
    return {
      outputProductId,
      recipeId: recipeId || undefined,
      warehouseId: warehouseId || undefined,
      rawMaterials,
      outputs,
      note: note || undefined,
    };
  }, [outputProductId, rawRows, variantPlans, note, products, recipeId, warehouseId]);

  React.useEffect(() => {
    if (!payload) {
      setPreview(null);
      return;
    }
    const t = setTimeout(() => {
      void inventoryApi.previewProduction(payload).then(setPreview).catch(() => setPreview(null));
    }, 150);
    return () => clearTimeout(t);
  }, [payload]);

  async function handleRun() {
    if (!payload || !preview?.ok) {
      toast.error(preview?.limitedBy || 'Fill materials, warehouse, and pack quantities');
      return;
    }
    setRunning(true);
    try {
      const result = await inventoryApi.runProduction(payload);
      toast.success(
        `${result.batchNumber}: ${result.unitsProduced} units · ${formatCurrency(result.materialCost)}`,
      );
      onCompleted?.(result);
      recipeBase.current = null;
      setRecipeId('');
      setRawRows([emptyRawRow(defaultCode('kg'))]);
      setVariantPlans((plans) => plans.map((p) => ({ ...p, units: '' })));
      setNote('');
      const refreshed = await inventoryApi.listProducts({ page: 1, pageSize: 200, filter: 'active' });
      setProducts(refreshed.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Production failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
      <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'py-3')}>
        <div className="flex items-center gap-2">
          <Calculator className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <CardTitle className="text-sm">Run production</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Recipe → warehouse → packs. Materials scale automatically.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Recipe" className="sm:col-span-2">
            <FormSearchSelect
              value={recipeId}
              onChange={onPickRecipe}
              options={recipeOptions}
              placeholder="Pick recipe or custom…"
            />
          </FormField>
          <FormField label="Warehouse" required>
            <FormSearchSelect
              value={warehouseId}
              onChange={setWarehouseId}
              options={warehouseOptions}
              placeholder="Warehouse…"
              searchable={warehouseOptions.length > 6}
            />
          </FormField>
          <FormField label="Finished product" required>
            <FormSearchSelect
              value={outputProductId}
              onChange={(id) => {
                setOutputProductId(id);
                if (recipeId) {
                  const r = recipes.find((x) => x.id === recipeId);
                  if (r && r.outputProductId !== id) {
                    setRecipeId('');
                    recipeBase.current = null;
                    setRawRows((rows) => rows.map((row) => ({ ...row, locked: false })));
                  }
                }
              }}
              options={productOptions}
              placeholder="Finished product…"
              disabled={Boolean(recipeId)}
            />
          </FormField>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Materials
            </p>
            {!recipeId ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => setRawRows((rows) => [...rows, emptyRawRow(defaultCode('kg'))])}
              >
                <Plus className="size-3.5" />
                Add
              </Button>
            ) : (
              <span className="text-[10px] text-muted-foreground">Scaled from recipe</span>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/40 text-[11px] text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Product</th>
                  <th className="w-24 px-2 py-1.5 font-medium">Qty</th>
                  <th className="w-20 px-2 py-1.5 font-medium">Unit</th>
                  <th className="w-24 px-2 py-1.5 font-medium">Rate</th>
                  <th className="w-28 px-2 py-1.5 font-medium">Cost</th>
                  <th className="w-10 px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {rawRows.map((row) => (
                  <tr key={row.key} className="border-t border-border/50">
                    <td className="px-2 py-1.5">
                      <FormSearchSelect
                        value={row.productId}
                        onChange={(v) => onPickMaterial(row.key, v)}
                        options={productOptions}
                        placeholder="Material…"
                        disabled={row.locked}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <FormInput
                        type="number"
                        min={0}
                        step="any"
                        className="h-8"
                        value={row.quantity}
                        disabled={row.locked}
                        onChange={(e) =>
                          patchRaw(row.key, { quantity: e.target.value }, 'fromRate')
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <FormSearchSelect
                        value={row.unit}
                        onChange={(v) => patchRaw(row.key, { unit: v }, 'fromRate')}
                        options={unitOptions}
                        searchable={false}
                        disabled={row.locked}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <FormInput
                        type="number"
                        min={0}
                        step="any"
                        className="h-8"
                        value={row.costPerKg}
                        onChange={(e) =>
                          patchRaw(row.key, { costPerKg: e.target.value }, 'fromRate')
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <FormInput
                        type="number"
                        min={0}
                        step="any"
                        className="h-8"
                        value={row.totalCost}
                        onChange={(e) =>
                          patchRaw(row.key, { totalCost: e.target.value }, 'fromTotal')
                        }
                      />
                    </td>
                    <td className="px-1 py-1.5">
                      {!row.locked && rawRows.length > 1 ? (
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {outputDetail?.variants?.length ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Packs produced
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {variantPlans.map((plan) => (
                <div
                  key={plan.variantId}
                  className="flex items-center gap-2 rounded-lg border border-border/70 px-2.5 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{plan.variantLabel}</p>
                    <p className="text-[10px] text-muted-foreground">{plan.gramsPerUnit}g / unit</p>
                  </div>
                  <FormInput
                    type="number"
                    min={0}
                    className="h-8 w-20"
                    placeholder="0"
                    value={plan.units}
                    onChange={(e) =>
                      setVariantPlans((plans) =>
                        plans.map((p) =>
                          p.variantId === plan.variantId ? { ...p, units: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ) : outputProductId ? (
          <p className="text-xs text-muted-foreground">This product has no variants yet.</p>
        ) : null}

        <div className="space-y-2">
          <FormField label="Note">
            <FormInput
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional batch note"
            />
          </FormField>

          {preview ? (
            <ProductionHisabPreview
              preview={preview}
              finishedProductName={
                products.find((p) => p.id === outputProductId)?.name ??
                outputDetail?.name
              }
              warehouseName={warehouses.find((w) => w.id === warehouseId)?.name}
              recipeName={
                recipeId ? recipes.find((r) => r.id === recipeId)?.name : undefined
              }
            />
          ) : payload ? (
            <p className="text-xs text-muted-foreground">Calculating cost summary…</p>
          ) : null}

          <Can permission="inventory.mixer">
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
              <Button
                type="button"
                className="h-9 min-w-[9rem]"
                disabled={running || !preview?.ok}
                onClick={() => void handleRun()}
              >
                {running ? 'Saving…' : 'Save production'}
              </Button>
            </div>
          </Can>
        </div>
      </CardContent>
    </Card>
  );
}
