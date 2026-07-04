'use client';

import * as React from 'react';
import type {
  MixerRecipeListItem,
  ProductionBatchResult,
  PurchaseListItem,
  PurchaseReturnListItem,
  StockAdjustmentListItem,
  SupplierListItem,
} from '@laam/types';
import { RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

import { postInventoryPurchase } from '@/features/accounting/data/mock-accounting';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ADJUSTMENT_REASON_LABELS,
  PURCHASE_PAYMENT_LABELS,
  PURCHASE_STOCK_LABELS,
} from '@/features/inventory/config/product-filters';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventoryResponsiveList } from '@/features/inventory/components/inventory-responsive-list';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import { ProductionBatchPanel } from '@/features/inventory/components/production-batch-panel';
import { MOCK_INVENTORY_PRODUCTS } from '@/features/inventory/data/mock-inventory';
import { useProductMutations } from '@/features/inventory/hooks/use-product-mutations';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { downloadCsv } from '@/lib/export-csv';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

function InventoryPageLayout({
  title,
  description,
  children,
  onExport,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onExport?: () => void;
}) {
  return (
    <PageShell title="Inventory" description={description}>
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <InventorySubNav />
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          </div>
          {onExport ? (
            <Button type="button" size="sm" variant="outline" className="shrink-0 self-start" onClick={onExport}>
              Export CSV
            </Button>
          ) : null}
        </div>
        {children}
      </div>
    </PageShell>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full max-w-md min-w-0">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <FormInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}

export function SuppliersListShell() {
  const [search, setSearch] = React.useState('');
  const [items, setItems] = React.useState<SupplierListItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    void inventoryApi.listSuppliers(search).then((r) => {
      setItems(r.items);
      setLoading(false);
    });
  }, [search]);

  return (
    <InventoryPageLayout
      title="Suppliers"
      description="Vendors for honey, dates, packaging, and raw materials."
      onExport={() =>
        downloadCsv(
          'suppliers.csv',
          ['Name', 'Contact', 'Phone', 'Balance', 'Products', 'Status'],
          items.map((s) => [s.name, s.contactPerson ?? '', s.phone, s.balance, s.productCount, s.status]),
        )
      }
    >
      <SearchField value={search} onChange={setSearch} placeholder="Search supplier…" />
      <InventoryResponsiveList
        loading={loading}
        emptyTitle="No suppliers"
        emptyDescription="Add suppliers when you start purchasing stock."
        headers={['Supplier', 'Contact', 'Phone', 'Balance', 'Products', 'Status']}
        rows={items.map((s) => ({
          id: s.id,
          cells: [
            <div key="n" className="min-w-0">
              <p className="truncate font-medium">{s.name}</p>
              {s.address ? <p className="truncate text-xs text-muted-foreground">{s.address}</p> : null}
            </div>,
            s.contactPerson ?? '—',
            <span key="ph" className="whitespace-nowrap font-mono text-xs">{s.phone}</span>,
            <span
              key="bal"
              className={cn(
                'whitespace-nowrap tabular-nums',
                s.balance < 0 ? 'text-red-600' : s.balance > 0 ? 'text-amber-600' : '',
              )}
            >
              {formatCurrency(Math.abs(s.balance))}
              {s.balance < 0 ? ' due' : s.balance > 0 ? ' advance' : ''}
            </span>,
            s.productCount,
            <Badge key="st" variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>,
          ],
          mobile: (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{s.phone}</p>
                </div>
                <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{s.contactPerson ?? 'No contact'}</span>
                <span>{s.productCount} products</span>
                <span className={cn('tabular-nums', s.balance < 0 ? 'text-red-600' : '')}>
                  {formatCurrency(Math.abs(s.balance))}
                  {s.balance < 0 ? ' due' : s.balance > 0 ? ' advance' : ''}
                </span>
              </div>
            </div>
          ),
        }))}
      />
    </InventoryPageLayout>
  );
}

export function PurchaseListShell() {
  const [search, setSearch] = React.useState('');
  const [data, setData] = React.useState<{
    items: PurchaseListItem[];
    summary: { unpaidTotal: number; pendingReceipt: number };
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    void inventoryApi.listPurchases(search).then((r) => {
      setData(r);
      setLoading(false);
    });
  }, [search]);

  async function receiveStock(p: PurchaseListItem) {
    const product = MOCK_INVENTORY_PRODUCTS[0];
    if (product) {
      await inventoryApi.updateProduct(product.id, {
        stockAdjustment: { delta: p.itemCount || 1, reason: `Received ${p.purchaseNumber}` },
      });
    }
    postInventoryPurchase({
      amount: p.totalAmount,
      supplierName: p.supplierName,
      reference: p.purchaseNumber,
      paymentMethod: p.paymentStatus === 'paid' ? 'bank' : 'cash',
      accountName: 'DBBL Current',
      paidNow: p.paymentStatus === 'paid',
    });
    toast.success(`Stock received for ${p.purchaseNumber} — posted to accounting`);
    setData(await inventoryApi.listPurchases(search));
  }

  return (
    <InventoryPageLayout
      title="Purchase orders"
      description="Stock in from suppliers — track payment and receipt."
      onExport={() =>
        downloadCsv(
          'purchases.csv',
          ['PO', 'Supplier', 'Date', 'Items', 'Amount', 'Payment', 'Stock'],
          (data?.items ?? []).map((p) => [
            p.purchaseNumber,
            p.supplierName,
            p.purchaseDate,
            p.itemCount,
            p.totalAmount,
            p.paymentStatus,
            p.stockStatus,
          ]),
        )
      }
    >
      <CrmSummaryStrip
        items={[
          { id: 'count', label: 'Orders', value: data ? String(data.items.length) : '—' },
          { id: 'unpaid', label: 'Unpaid total', value: data ? formatCurrency(data.summary.unpaidTotal) : '—' },
          { id: 'pending', label: 'Pending receipt', value: data ? String(data.summary.pendingReceipt) : '—' },
        ]}
        className="grid-cols-1 sm:grid-cols-3"
      />
      <SearchField value={search} onChange={setSearch} placeholder="Search PO or supplier…" />
      <InventoryResponsiveList
        loading={loading}
        emptyTitle="No purchase orders"
        emptyDescription="Create a purchase when you buy stock from suppliers."
        headers={['PO #', 'Supplier', 'Date', 'Items', 'Amount', 'Payment', 'Stock', '']}
        rows={(data?.items ?? []).map((p) => ({
          id: p.id,
          cells: [
            <span key="po" className="whitespace-nowrap font-mono font-medium">{p.purchaseNumber}</span>,
            <span key="s" className="max-w-[10rem] truncate">{p.supplierName}</span>,
            <span key="d" className="whitespace-nowrap text-muted-foreground">{p.purchaseDate}</span>,
            p.itemCount,
            <span key="a" className="whitespace-nowrap tabular-nums">{formatCurrency(p.totalAmount)}</span>,
            <Badge key="pay" variant={p.paymentStatus === 'paid' ? 'default' : 'secondary'}>
              {PURCHASE_PAYMENT_LABELS[p.paymentStatus]}
            </Badge>,
            <Badge key="stk" variant="outline">{PURCHASE_STOCK_LABELS[p.stockStatus]}</Badge>,
            p.stockStatus !== 'received' ? (
              <Button key="recv" type="button" size="sm" variant="outline" onClick={() => void receiveStock(p)}>
                Receive
              </Button>
            ) : (
              <span key="recv" className="text-xs text-muted-foreground">Done</span>
            ),
          ],
          mobile: (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium">{p.purchaseNumber}</p>
                  <p className="truncate text-sm text-muted-foreground">{p.supplierName}</p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums">{formatCurrency(p.totalAmount)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={p.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                  {PURCHASE_PAYMENT_LABELS[p.paymentStatus]}
                </Badge>
                <Badge variant="outline">{PURCHASE_STOCK_LABELS[p.stockStatus]}</Badge>
                <span className="self-center text-xs text-muted-foreground">
                  {p.purchaseDate} · {p.itemCount} items
                </span>
              </div>
              {p.stockStatus !== 'received' ? (
                <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => void receiveStock(p)}>
                  Receive stock
                </Button>
              ) : null}
            </div>
          ),
        }))}
      />
    </InventoryPageLayout>
  );
}

export function PurchaseReturnsListShell() {
  const [items, setItems] = React.useState<PurchaseReturnListItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    void inventoryApi.listPurchaseReturns().then((r) => {
      setItems(r.items);
      setLoading(false);
    });
  }, []);

  return (
    <InventoryPageLayout
      title="Purchase returns"
      description="Return damaged or wrong stock to suppliers."
    >
      <InventoryResponsiveList
        loading={loading}
        emptyTitle="No purchase returns"
        emptyDescription="Returns will show here when you send stock back to suppliers."
        headers={['Return #', 'PO', 'Supplier', 'Items', 'Amount', 'Status', 'Reason']}
        rows={items.map((r) => ({
          id: r.id,
          cells: [
            <span key="rn" className="font-mono font-medium">{r.returnNumber}</span>,
            r.purchaseNumber,
            <span key="s" className="max-w-[10rem] truncate">{r.supplierName}</span>,
            r.itemCount,
            <span key="a" className="tabular-nums">{formatCurrency(r.totalAmount)}</span>,
            <Badge key="st" variant={r.status === 'completed' ? 'default' : 'secondary'}>{r.status}</Badge>,
            <span key="rs" className="max-w-[12rem] truncate text-muted-foreground">{r.reason ?? '—'}</span>,
          ],
          mobile: (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium">{r.returnNumber}</p>
                  <p className="truncate text-sm text-muted-foreground">{r.supplierName}</p>
                </div>
                <Badge variant={r.status === 'completed' ? 'default' : 'secondary'}>{r.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>PO {r.purchaseNumber}</span>
                <span>{r.itemCount} items</span>
                <span className="tabular-nums font-medium text-foreground">{formatCurrency(r.totalAmount)}</span>
              </div>
              {r.reason ? <p className="text-xs text-muted-foreground">{r.reason}</p> : null}
            </div>
          ),
        }))}
      />
    </InventoryPageLayout>
  );
}

export function AdjustmentListShell() {
  const { createAdjustment, isLoading } = useProductMutations();
  const [items, setItems] = React.useState<StockAdjustmentListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [productId, setProductId] = React.useState('');
  const [delta, setDelta] = React.useState('1');
  const [reason, setReason] = React.useState<keyof typeof ADJUSTMENT_REASON_LABELS>('count_correction');
  const [note, setNote] = React.useState('');

  const load = React.useCallback(() => {
    setLoading(true);
    void inventoryApi.listAdjustments().then((r) => {
      setItems(r.items);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleAdjust() {
    const d = Number(delta);
    if (!productId || !Number.isFinite(d) || d === 0) return;
    await createAdjustment({ productId, delta: d, reason, note: note || undefined });
    setNote('');
    load();
  }

  const productOptions = MOCK_INVENTORY_PRODUCTS.map((p) => ({
    value: p.id,
    label: `${p.sku} — ${p.name}`,
  }));

  const reasonOptions = (Object.keys(ADJUSTMENT_REASON_LABELS) as (keyof typeof ADJUSTMENT_REASON_LABELS)[]).map(
    (v) => ({ value: v, label: ADJUSTMENT_REASON_LABELS[v] }),
  );

  return (
    <InventoryPageLayout
      title="Stock adjustment"
      description="Manual stock +/- with reason and audit trail."
    >
      <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Quick adjust</CardTitle>
        </CardHeader>
        <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4')}>
          <FormField label="Product">
            <FormSearchSelect value={productId} onChange={setProductId} options={productOptions} placeholder="Select product…" />
          </FormField>
          <FormField label="Change (+/−)">
            <FormInput type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
          </FormField>
          <FormField label="Reason">
            <FormSearchSelect value={reason} onChange={(v) => setReason(v as typeof reason)} options={reasonOptions} searchable={false} />
          </FormField>
          <FormField label="Note">
            <FormInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
          </FormField>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="button" disabled={isLoading || !productId} onClick={() => void handleAdjust()}>
              Apply adjustment
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Adjustment history</h3>
        <Button type="button" size="sm" variant="outline" onClick={load}>
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </div>

      <InventoryResponsiveList
        loading={loading}
        emptyTitle="No adjustments yet"
        emptyDescription="Use quick adjust above to correct stock counts."
        headers={['Product', 'Before', 'Change', 'After', 'Reason', 'By', 'Date']}
        rows={items.map((a) => ({
          id: a.id,
          cells: [
            <div key="p" className="min-w-0">
              <p className="truncate font-medium">{a.productName}</p>
              <p className="font-mono text-xs text-muted-foreground">{a.sku}</p>
            </div>,
            a.previousStock,
            <span key="d" className={cn('font-semibold tabular-nums', a.delta > 0 ? 'text-emerald-600' : 'text-red-600')}>
              {a.delta > 0 ? `+${a.delta}` : a.delta}
            </span>,
            a.newStock,
            ADJUSTMENT_REASON_LABELS[a.reason],
            a.adjustedBy,
            new Date(a.adjustedAt).toLocaleDateString('en-GB'),
          ],
          mobile: (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.productName}</p>
                  <p className="font-mono text-xs text-muted-foreground">{a.sku}</p>
                </div>
                <span className={cn('shrink-0 font-semibold tabular-nums', a.delta > 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {a.delta > 0 ? `+${a.delta}` : a.delta}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{a.previousStock} → {a.newStock}</span>
                <span>{ADJUSTMENT_REASON_LABELS[a.reason]}</span>
                <span>{a.adjustedBy}</span>
                <span>{new Date(a.adjustedAt).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          ),
        }))}
      />
    </InventoryPageLayout>
  );
}

export function MixerListShell() {
  const [items, setItems] = React.useState<MixerRecipeListItem[]>([]);
  const [runs, setRuns] = React.useState<ProductionBatchResult[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    setLoading(true);
    void Promise.all([
      inventoryApi.listMixerRecipes(),
      inventoryApi.listProductionRuns(),
    ]).then(([recipes, production]) => {
      setItems(recipes.items);
      setRuns(production.items);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function applyRecipe(recipe: MixerRecipeListItem) {
    toast.message(`Recipe: ${recipe.name}`, {
      description: `Use the calculator above — output ${recipe.outputProductName}, typical inputs listed on the card.`,
    });
  }

  return (
    <InventoryPageLayout
      title="Mixer & production"
      description="Bulk raw material → finished products by grams. Accounting posts automatically."
    >
      <ProductionBatchPanel onCompleted={() => load()} />

      {runs.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Recent production runs</h3>
          <InventoryResponsiveList
            headers={['Batch', 'Output', 'Units', 'g/unit', 'Used', 'Leftover', 'Cost/unit', 'Total']}
            rows={runs.map((r) => ({
              id: r.id,
              cells: [
                <span key="b" className="font-mono text-xs font-medium">{r.batchNumber}</span>,
                <span key="o" className="max-w-[10rem] truncate">{r.outputProductName}</span>,
                r.unitsProduced,
                `${r.gramsPerUnit}g`,
                `${r.usedGrams.toLocaleString()}g`,
                `${r.leftoverGrams.toLocaleString()}g`,
                formatCurrency(r.costPerUnit),
                formatCurrency(r.materialCost),
              ],
              mobile: (
                <div className="space-y-1">
                  <div className="flex justify-between gap-2">
                    <p className="font-mono text-xs font-medium">{r.batchNumber}</p>
                    <p className="font-semibold tabular-nums">{formatCurrency(r.materialCost)}</p>
                  </div>
                  <p className="text-sm">
                    {r.unitsProduced}× {r.outputProductName} ({r.gramsPerUnit}g each)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Used {r.usedGrams.toLocaleString()}g · leftover {r.leftoverGrams.toLocaleString()}g ·{' '}
                    {formatCurrency(r.costPerUnit)}/unit
                  </p>
                </div>
              ),
            }))}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Saved recipes</h3>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className={ORDER_CARD_CLASS}>
                <CardContent className="h-32 animate-pulse bg-muted/40" />
              </Card>
            ))}
          </div>
        ) : !items.length ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardContent className="p-6">
              <p className="text-center text-sm text-muted-foreground">No saved recipes yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {items.map((recipe) => (
              <Card key={recipe.id} className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
                <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="min-w-0 truncate text-sm">{recipe.name}</CardTitle>
                    <Badge variant={recipe.status === 'active' ? 'default' : 'secondary'} className="shrink-0">
                      {recipe.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className={ORDER_SECTION_BODY_CLASS}>
                  <p className="text-sm">
                    Output: <strong>{recipe.outputQty}×</strong> {recipe.outputProductName}{' '}
                    <span className="font-mono text-xs text-muted-foreground">({recipe.outputSku})</span>
                  </p>
                  <p className="mt-3 text-xs font-medium text-muted-foreground">Inputs</p>
                  <ul className="mt-1 space-y-1">
                    {recipe.inputs.map((input, i) => (
                      <li key={i} className="text-sm">
                        {input.quantity} {input.unit} — {input.productName}{' '}
                        <span className="font-mono text-xs text-muted-foreground">({input.sku})</span>
                      </li>
                    ))}
                  </ul>
                  {recipe.lastMixedAt ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Last mixed {new Date(recipe.lastMixedAt).toLocaleDateString('en-GB')}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    className="mt-4 h-7"
                    variant="outline"
                    onClick={() => applyRecipe(recipe)}
                  >
                    Use as guide
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </InventoryPageLayout>
  );
}
