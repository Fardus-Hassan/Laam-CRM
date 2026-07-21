'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  CreatePurchasePayload,
  InventoryProductDetail,
  InventoryProductListItem,
  PurchasePaymentStatus,
  SupplierListItem,
} from '@laam/types';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import { useInventoryUnits } from '@/features/inventory/hooks/use-inventory-units';
import { PURCHASE_PAYMENT_LABELS } from '@/features/inventory/config/product-filters';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type LineDraft = {
  key: string;
  productId: string;
  variantId: string;
  quantity: string;
  uomCode: string;
  unitCost: string;
  variants: InventoryProductDetail['variants'];
};

function emptyLine(defaultUom = 'pcs'): LineDraft {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: '',
    variantId: '',
    quantity: '1',
    uomCode: defaultUom,
    unitCost: '',
    variants: [],
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function CreatePurchasePage() {
  const router = useRouter();
  const { unitOptions, defaultCode } = useInventoryUnits();
  const [suppliers, setSuppliers] = React.useState<SupplierListItem[]>([]);
  const [products, setProducts] = React.useState<InventoryProductListItem[]>([]);
  const [supplierId, setSupplierId] = React.useState('');
  const [purchaseNumber, setPurchaseNumber] = React.useState(`PO-${Date.now().toString().slice(-6)}`);
  const [paymentStatus, setPaymentStatus] = React.useState<PurchasePaymentStatus>('unpaid');
  const [purchaseDate, setPurchaseDate] = React.useState(todayIso());
  const [dueDate, setDueDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [lines, setLines] = React.useState<LineDraft[]>([emptyLine()]);
  const [saving, setSaving] = React.useState(false);
  const [receiveAfter, setReceiveAfter] = React.useState(false);

  React.useEffect(() => {
    void Promise.all([
      inventoryApi.listSuppliers(),
      inventoryApi.listProducts({ page: 1, pageSize: 100, filter: 'active' }),
    ]).then(([supplierRes, productRes]) => {
      setSuppliers(supplierRes.items.filter((s) => s.status === 'active'));
      setProducts(productRes.items);
    });
  }, []);

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: `${s.name}${s.phone ? ` · ${s.phone}` : ''}`,
  }));

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.sku} — ${p.name}`,
  }));

  const paymentOptions = (Object.keys(PURCHASE_PAYMENT_LABELS) as PurchasePaymentStatus[]).map(
    (value) => ({ value, label: PURCHASE_PAYMENT_LABELS[value] }),
  );

  const grandTotal = lines.reduce((sum, line) => {
    const qty = Number(line.quantity);
    const cost = Number(line.unitCost);
    if (!Number.isFinite(qty) || !Number.isFinite(cost)) return sum;
    return sum + qty * cost;
  }, 0);

  async function onProductChange(key: string, productId: string) {
    const detail = productId ? await inventoryApi.getProduct(productId) : null;
    const variants = detail?.variants ?? [];
    const first = variants[0];
    setLines((rows) =>
      rows.map((row) =>
        row.key === key
          ? {
              ...row,
              productId,
              variants,
              variantId: first?.id ?? '',
              uomCode: defaultCode(first?.baseUomCode),
              unitCost: first ? String(first.costPrice) : '',
            }
          : row,
      ),
    );
  }

  function patchLine(key: string, patch: Partial<LineDraft>) {
    setLines((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) {
      toast.error('Select a supplier');
      return;
    }
    if (!purchaseNumber.trim()) {
      toast.error('Enter a purchase number');
      return;
    }

    const payloadLines = lines
      .map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: Number(line.quantity),
        unitCost: Number(line.unitCost),
        uomCode: line.uomCode || defaultCode('pcs'),
      }))
      .filter(
        (line) =>
          line.productId &&
          line.variantId &&
          Number.isFinite(line.quantity) &&
          line.quantity > 0 &&
          Number.isFinite(line.unitCost) &&
          line.unitCost >= 0,
      );

    if (!payloadLines.length) {
      toast.error('Add at least one valid line (product, variant, qty, cost)');
      return;
    }

    const payload: CreatePurchasePayload = {
      supplierId,
      purchaseNumber: purchaseNumber.trim(),
      paymentStatus,
      purchaseDate,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
      lines: payloadLines,
    };

    setSaving(true);
    try {
      const created = await inventoryApi.createPurchase(payload);
      if (receiveAfter) {
        await inventoryApi.receivePurchase(created.id);
        toast.success(`${created.purchaseNumber} created and stock received`);
      } else {
        toast.success(`${created.purchaseNumber} created — pending receipt`);
      }
      router.push('/dashboard/inventory/purchase');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create purchase');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell title="Inventory" description="Create a purchase order from a supplier.">
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <InventorySubNav />
        <div className="flex items-center gap-3">
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link href="/dashboard/inventory/purchase">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">New purchase</h2>
            <p className="text-sm text-muted-foreground">Supplier, lines, then create or create & receive.</p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Order details</CardTitle>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3')}>
              <FormField label="Supplier" required>
                <FormSearchSelect
                  value={supplierId}
                  onChange={setSupplierId}
                  options={supplierOptions}
                  placeholder="Select supplier…"
                />
              </FormField>
              <FormField label="PO number" required>
                <FormInput value={purchaseNumber} onChange={(e) => setPurchaseNumber(e.target.value)} />
              </FormField>
              <FormField label="Payment">
                <FormSearchSelect
                  value={paymentStatus}
                  onChange={(v) => setPaymentStatus(v as PurchasePaymentStatus)}
                  options={paymentOptions}
                  searchable={false}
                />
              </FormField>
              <FormField label="Purchase date" required>
                <FormInput type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
              </FormField>
              <FormField label="Due date">
                <FormInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </FormField>
              <FormField label="Notes" className="sm:col-span-2 lg:col-span-3">
                <FormTextarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                  rows={2}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
            <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between')}>
              <CardTitle className="text-sm">Lines</CardTitle>
              <Button type="button" size="sm" variant="outline" onClick={() => setLines((rows) => [...rows, emptyLine(defaultCode('pcs'))])}>
                <Plus className="size-3.5" />
                Add line
              </Button>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
              {lines.map((line) => {
                const variantOptions = line.variants.map((v) => ({
                  value: v.id,
                  label: `${v.label} · ${v.sku}`,
                }));
                return (
                  <div
                    key={line.key}
                    className="grid gap-3 rounded-md border border-border/60 p-3 sm:grid-cols-2 lg:grid-cols-12"
                  >
                    <FormField label="Product" className="lg:col-span-4" required>
                      <FormSearchSelect
                        value={line.productId}
                        onChange={(v) => void onProductChange(line.key, v)}
                        options={productOptions}
                        placeholder="Select product…"
                      />
                    </FormField>
                    <FormField label="Variant" className="lg:col-span-3" required>
                      <FormSearchSelect
                        value={line.variantId}
                        onChange={(v) => {
                          const variant = line.variants.find((item) => item.id === v);
                          patchLine(line.key, {
                            variantId: v,
                            uomCode: defaultCode(variant?.baseUomCode),
                            unitCost: variant ? String(variant.costPrice) : line.unitCost,
                          });
                        }}
                        options={variantOptions}
                        placeholder={line.productId ? 'Select variant…' : 'Pick product first'}
                        disabled={!line.productId}
                      />
                    </FormField>
                    <FormField label="Qty" className="lg:col-span-2" required>
                      <FormInput
                        type="number"
                        min={0.000001}
                        step="any"
                        value={line.quantity}
                        onChange={(e) => patchLine(line.key, { quantity: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Unit" className="lg:col-span-2" required>
                      <FormSearchSelect
                        value={line.uomCode || defaultCode('pcs')}
                        onChange={(v) => patchLine(line.key, { uomCode: v })}
                        options={unitOptions}
                        searchable
                      />
                    </FormField>
                    <FormField label="Unit cost" className="lg:col-span-2" required>
                      <FormInput
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitCost}
                        onChange={(e) => patchLine(line.key, { unitCost: e.target.value })}
                      />
                    </FormField>
                    <div className="flex items-end lg:col-span-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground"
                        disabled={lines.length === 1}
                        onClick={() => setLines((rows) => rows.filter((row) => row.key !== line.key))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <p className="text-sm font-medium tabular-nums">
                Total: {formatCurrency(grandTotal)}
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={receiveAfter}
                onChange={(e) => setReceiveAfter(e.target.checked)}
                className="size-4 rounded border"
              />
              Also receive stock into inventory
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/inventory/purchase">Cancel</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : receiveAfter ? 'Create & receive' : 'Create purchase'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
