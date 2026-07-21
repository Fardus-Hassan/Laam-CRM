'use client';

import * as React from 'react';
import Link from 'next/link';
import type {
  InventoryProductDetail,
  InventoryProductListItem,
  MixerRecipeListItem,
  ProductionBatchResult,
  PurchaseListItem,
  PurchaseReturnListItem,
  StockAdjustmentListItem,
  SupplierListItem,
} from '@laam/types';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ADJUSTMENT_REASON_LABELS,
  PURCHASE_PAYMENT_LABELS,
  PURCHASE_STOCK_LABELS,
} from '@/features/inventory/config/product-filters';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventoryResponsiveList } from '@/features/inventory/components/inventory-responsive-list';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import { useInventoryUnits } from '@/features/inventory/hooks/use-inventory-units';
import { ProductionBatchPanel } from '@/features/inventory/components/production-batch-panel';
import { ProductionLedger } from '@/features/inventory/components/production-ledger';
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
  actions,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onExport?: () => void;
  actions?: React.ReactNode;
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
          {(actions || onExport) ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
              {actions}
              {onExport ? (
                <Can permission="inventory.export">
                  <Button type="button" size="sm" variant="outline" onClick={onExport}>
                    Export CSV
                  </Button>
                </Can>
              ) : null}
            </div>
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
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SupplierListItem | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState('');
  const [contactPerson, setContactPerson] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [status, setStatus] = React.useState<'active' | 'inactive'>('active');

  const load = React.useCallback(() => {
    setLoading(true);
    void inventoryApi
      .listSuppliers(search)
      .then((r) => setItems(r.items))
      .catch((error) => {
        setItems([]);
        toast.error(error instanceof Error ? error.message : 'Could not load suppliers');
      })
      .finally(() => setLoading(false));
  }, [search]);

  React.useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setStatus('active');
    setDialogOpen(true);
  }

  function openEdit(supplier: SupplierListItem) {
    setEditing(supplier);
    setName(supplier.name);
    setContactPerson(supplier.contactPerson ?? '');
    setPhone(supplier.phone);
    setEmail(supplier.email ?? '');
    setAddress(supplier.address ?? '');
    setStatus(supplier.status);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        status,
      };
      if (editing) {
        await inventoryApi.updateSupplier(editing.id, payload);
        toast.success('Supplier updated');
      } else {
        await inventoryApi.createSupplier(payload);
        toast.success('Supplier created');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save supplier');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supplier: SupplierListItem) {
    if (!window.confirm(`Delete ${supplier.name}?`)) return;
    try {
      await inventoryApi.deleteSupplier(supplier.id);
      toast.success('Supplier deleted');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete supplier');
    }
  }

  async function toggleStatus(supplier: SupplierListItem) {
    try {
      await inventoryApi.updateSupplier(supplier.id, {
        status: supplier.status === 'active' ? 'inactive' : 'active',
      });
      toast.success(
        supplier.status === 'active' ? 'Supplier marked inactive' : 'Supplier marked active',
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update supplier');
    }
  }

  return (
    <InventoryPageLayout
      title="Suppliers"
      description="Vendors for honey, dates, packaging, and raw materials."
      actions={
        <Can permission="inventory.purchase">
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add supplier
          </Button>
        </Can>
      }
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
        headers={['Supplier', 'Contact', 'Phone', 'Balance', 'Products', 'Status', '']}
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
            <div key="actions" className="flex flex-wrap gap-1">
              <Can permission="inventory.purchase">
                <Button type="button" size="sm" variant="outline" onClick={() => openEdit(s)}>
                  Edit
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void toggleStatus(s)}>
                  {s.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void handleDelete(s)}>
                  Delete
                </Button>
              </Can>
            </div>,
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
              <Can permission="inventory.purchase">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(s)}>
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => void toggleStatus(s)}>
                    {s.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </Can>
            </div>
          ),
        }))}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit supplier' : 'Add supplier'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Name" required className="sm:col-span-2">
              <FormInput value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Contact person">
              <FormInput value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </FormField>
            <FormField label="Phone" required>
              <FormInput value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FormField>
            <FormField label="Email">
              <FormInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormField>
            <FormField label="Status">
              <FormSearchSelect
                value={status}
                onChange={(v) => setStatus(v as 'active' | 'inactive')}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                searchable={false}
              />
            </FormField>
            <FormField label="Address" className="sm:col-span-2">
              <FormInput value={address} onChange={(e) => setAddress(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    void inventoryApi
      .listPurchases(search)
      .then(setData)
      .catch((error) => {
        setData(null);
        toast.error(error instanceof Error ? error.message : 'Could not load purchases');
      })
      .finally(() => setLoading(false));
  }, [search]);

  async function receiveStock(p: PurchaseListItem) {
    try {
      await inventoryApi.receivePurchase(p.id);
      toast.success(`Stock received for ${p.purchaseNumber} — posted to accounting`);
      setData(await inventoryApi.listPurchases(search));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not receive stock');
    }
  }

  async function cancelPurchase(p: PurchaseListItem) {
    if (!window.confirm(`Cancel ${p.purchaseNumber}?`)) return;
    try {
      await inventoryApi.cancelPurchase(p.id);
      toast.success(`${p.purchaseNumber} cancelled`);
      setData(await inventoryApi.listPurchases(search));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel purchase');
    }
  }

  return (
    <InventoryPageLayout
      title="Purchase orders"
      description="Stock in from suppliers — track payment and receipt."
      actions={
        <Button type="button" size="sm" asChild>
          <Link href="/dashboard/inventory/purchase/new">
            <Plus className="size-3.5" />
            New purchase
          </Link>
        </Button>
      }
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
            <Link
              key="po"
              href={`/dashboard/inventory/purchase/${p.id}`}
              className="whitespace-nowrap font-mono font-medium text-primary hover:underline"
            >
              {p.purchaseNumber}
            </Link>,
            <span key="s" className="max-w-[10rem] truncate">{p.supplierName}</span>,
            <span key="d" className="whitespace-nowrap text-muted-foreground">{p.purchaseDate}</span>,
            p.itemCount,
            <span key="a" className="whitespace-nowrap tabular-nums">{formatCurrency(p.totalAmount)}</span>,
            <Badge key="pay" variant={p.paymentStatus === 'paid' ? 'default' : 'secondary'}>
              {PURCHASE_PAYMENT_LABELS[p.paymentStatus]}
            </Badge>,
            <Badge key="stk" variant="outline">{PURCHASE_STOCK_LABELS[p.stockStatus]}</Badge>,
            <div key="actions" className="flex flex-wrap gap-1">
              <Button type="button" size="sm" variant="ghost" asChild>
                <Link href={`/dashboard/inventory/purchase/${p.id}`}>View</Link>
              </Button>
              {p.stockStatus === 'pending' ? (
                <>
                  <Button type="button" size="sm" variant="outline" onClick={() => void receiveStock(p)}>
                    Receive
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => void cancelPurchase(p)}>
                    Cancel
                  </Button>
                </>
              ) : p.stockStatus === 'received' ? (
                <span className="self-center text-xs text-muted-foreground">Done</span>
              ) : null}
            </div>,
          ],
          mobile: (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/inventory/purchase/${p.id}`}
                    className="font-mono text-sm font-medium text-primary hover:underline"
                  >
                    {p.purchaseNumber}
                  </Link>
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
              <div className="flex flex-col gap-2">
                <Button type="button" size="sm" variant="outline" className="w-full" asChild>
                  <Link href={`/dashboard/inventory/purchase/${p.id}`}>View details</Link>
                </Button>
                {p.stockStatus === 'pending' ? (
                  <>
                    <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => void receiveStock(p)}>
                      Receive stock
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="w-full" onClick={() => void cancelPurchase(p)}>
                      Cancel
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ),
        }))}
      />
    </InventoryPageLayout>
  );
}

type ReturnLineDraft = {
  key: string;
  productId: string;
  variantId: string;
  quantity: string;
  unitCost: string;
  variants: InventoryProductDetail['variants'];
};

function emptyReturnLine(): ReturnLineDraft {
  return {
    key: `ret-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: '',
    variantId: '',
    quantity: '1',
    unitCost: '',
    variants: [],
  };
}

export function PurchaseReturnsListShell() {
  const [items, setItems] = React.useState<PurchaseReturnListItem[]>([]);
  const [purchases, setPurchases] = React.useState<PurchaseListItem[]>([]);
  const [products, setProducts] = React.useState<InventoryProductListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [purchaseId, setPurchaseId] = React.useState('');
  const [returnNumber, setReturnNumber] = React.useState(`PR-${Date.now().toString().slice(-6)}`);
  const [purchaseNumber, setPurchaseNumber] = React.useState('');
  const [supplierName, setSupplierName] = React.useState('');
  const [returnDate, setReturnDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = React.useState('');
  const [lines, setLines] = React.useState<ReturnLineDraft[]>([emptyReturnLine()]);

  const load = React.useCallback(() => {
    setLoading(true);
    void Promise.all([
      inventoryApi.listPurchaseReturns(),
      inventoryApi.listPurchases(),
      inventoryApi.listProducts({ page: 1, pageSize: 100, filter: 'active' }),
    ])
      .then(([returns, purchaseRes, productRes]) => {
        setItems(returns.items);
        setPurchases(purchaseRes.items);
        setProducts(productRes.items);
      })
      .catch((error) => {
        setItems([]);
        toast.error(error instanceof Error ? error.message : 'Could not load purchase returns');
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const purchaseOptions = purchases.map((p) => ({
    value: p.id,
    label: `${p.purchaseNumber} — ${p.supplierName}`,
  }));

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.sku} — ${p.name}`,
  }));

  function onPickPurchase(id: string) {
    setPurchaseId(id);
    const purchase = purchases.find((p) => p.id === id);
    if (purchase) {
      setPurchaseNumber(purchase.purchaseNumber);
      setSupplierName(purchase.supplierName);
    }
  }

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
              unitCost: first ? String(first.costPrice) : '',
            }
          : row,
      ),
    );
  }

  async function handleCreate() {
    const payloadLines = lines
      .map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: Number(line.quantity),
        unitCost: Number(line.unitCost),
      }))
      .filter(
        (line) =>
          line.productId &&
          line.variantId &&
          Number.isInteger(line.quantity) &&
          line.quantity > 0 &&
          Number.isFinite(line.unitCost) &&
          line.unitCost >= 0,
      );

    if (!returnNumber.trim() || !purchaseNumber.trim() || !supplierName.trim() || !payloadLines.length) {
      toast.error('Return #, PO, supplier, and at least one valid line are required');
      return;
    }

    setSaving(true);
    try {
      const created = await inventoryApi.createPurchaseReturn({
        returnNumber: returnNumber.trim(),
        purchaseId: purchaseId || undefined,
        purchaseNumber: purchaseNumber.trim(),
        supplierName: supplierName.trim(),
        returnDate,
        reason: reason.trim() || undefined,
        lines: payloadLines,
      });
      toast.success(`${created.returnNumber} created`);
      setReturnNumber(`PR-${Date.now().toString().slice(-6)}`);
      setPurchaseId('');
      setPurchaseNumber('');
      setSupplierName('');
      setReason('');
      setLines([emptyReturnLine()]);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create return');
    } finally {
      setSaving(false);
    }
  }

  async function approveReturn(item: PurchaseReturnListItem) {
    try {
      await inventoryApi.approvePurchaseReturn(item.id);
      toast.success(`${item.returnNumber} approved`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve return');
    }
  }

  async function completeReturn(item: PurchaseReturnListItem) {
    try {
      await inventoryApi.completePurchaseReturn(item.id);
      toast.success(`${item.returnNumber} completed — stock deducted`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not complete return');
    }
  }

  return (
    <InventoryPageLayout
      title="Purchase returns"
      description="Return damaged or wrong stock to suppliers."
    >
      <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">New return</CardTitle>
        </CardHeader>
        <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-4')}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Link purchase (optional)">
              <FormSearchSelect
                value={purchaseId}
                onChange={onPickPurchase}
                options={purchaseOptions}
                placeholder="Select PO…"
              />
            </FormField>
            <FormField label="Return #" required>
              <FormInput value={returnNumber} onChange={(e) => setReturnNumber(e.target.value)} />
            </FormField>
            <FormField label="PO number" required>
              <FormInput value={purchaseNumber} onChange={(e) => setPurchaseNumber(e.target.value)} />
            </FormField>
            <FormField label="Supplier" required>
              <FormInput value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
            </FormField>
            <FormField label="Return date" required>
              <FormInput type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </FormField>
            <FormField label="Reason">
              <FormInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged / wrong item…" />
            </FormField>
          </div>

          {lines.map((line) => {
            const variantOptions = line.variants.map((v) => ({
              value: v.id,
              label: `${v.label} · ${v.sku}`,
            }));
            return (
              <div key={line.key} className="grid gap-3 rounded-md border border-border/60 p-3 sm:grid-cols-2 lg:grid-cols-12">
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
                      setLines((rows) =>
                        rows.map((row) =>
                          row.key === line.key
                            ? {
                                ...row,
                                variantId: v,
                                unitCost: variant ? String(variant.costPrice) : row.unitCost,
                              }
                            : row,
                        ),
                      );
                    }}
                    options={variantOptions}
                    placeholder={line.productId ? 'Select variant…' : 'Pick product first'}
                    disabled={!line.productId}
                  />
                </FormField>
                <FormField label="Qty" className="lg:col-span-2" required>
                  <FormInput
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((rows) =>
                        rows.map((row) => (row.key === line.key ? { ...row, quantity: e.target.value } : row)),
                      )
                    }
                  />
                </FormField>
                <FormField label="Unit cost" className="lg:col-span-2" required>
                  <FormInput
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitCost}
                    onChange={(e) =>
                      setLines((rows) =>
                        rows.map((row) => (row.key === line.key ? { ...row, unitCost: e.target.value } : row)),
                      )
                    }
                  />
                </FormField>
                <div className="flex items-end lg:col-span-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={lines.length === 1}
                    onClick={() => setLines((rows) => rows.filter((row) => row.key !== line.key))}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setLines((rows) => [...rows, emptyReturnLine()])}>
              <Plus className="size-3.5" />
              Add line
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleCreate()}>
              {saving ? 'Saving…' : 'Create return'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <InventoryResponsiveList
        loading={loading}
        emptyTitle="No purchase returns"
        emptyDescription="Returns will show here when you send stock back to suppliers."
        headers={['Return #', 'PO', 'Supplier', 'Items', 'Amount', 'Status', 'Reason', '']}
        rows={items.map((r) => ({
          id: r.id,
          cells: [
            <Link
              key="rn"
              href={`/dashboard/inventory/purchase-returns/${r.id}`}
              className="font-mono font-medium text-primary hover:underline"
            >
              {r.returnNumber}
            </Link>,
            r.purchaseNumber,
            <span key="s" className="max-w-[10rem] truncate">{r.supplierName}</span>,
            r.itemCount,
            <span key="a" className="tabular-nums">{formatCurrency(r.totalAmount)}</span>,
            <Badge key="st" variant={r.status === 'completed' ? 'default' : 'secondary'}>{r.status}</Badge>,
            <span key="rs" className="max-w-[12rem] truncate text-muted-foreground">{r.reason ?? '—'}</span>,
            <div key="actions" className="flex flex-wrap gap-1">
              <Button type="button" size="sm" variant="ghost" asChild>
                <Link href={`/dashboard/inventory/purchase-returns/${r.id}`}>View</Link>
              </Button>
              {r.status === 'pending' ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void approveReturn(r)}>
                  Approve
                </Button>
              ) : null}
              {r.status !== 'completed' ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void completeReturn(r)}>
                  Complete
                </Button>
              ) : null}
            </div>,
          ],
          mobile: (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/inventory/purchase-returns/${r.id}`}
                    className="font-mono text-sm font-medium text-primary hover:underline"
                  >
                    {r.returnNumber}
                  </Link>
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
              <div className="flex flex-col gap-2">
                <Button type="button" size="sm" variant="outline" className="w-full" asChild>
                  <Link href={`/dashboard/inventory/purchase-returns/${r.id}`}>View details</Link>
                </Button>
                {r.status === 'pending' ? (
                  <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => void approveReturn(r)}>
                    Approve
                  </Button>
                ) : null}
                {r.status !== 'completed' ? (
                  <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => void completeReturn(r)}>
                    Complete return
                  </Button>
                ) : null}
              </div>
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
  const [productOptions, setProductOptions] = React.useState<
    { value: string; label: string }[]
  >([]);

  const load = React.useCallback(() => {
    setLoading(true);
    void Promise.all([
      inventoryApi.listAdjustments(),
      inventoryApi.listProducts({ page: 1, pageSize: 100 }),
    ])
      .then(([adjustments, products]) => {
        setItems(adjustments.items);
        setProductOptions(
          products.items.map((product) => ({
            value: product.id,
            label: `${product.sku} — ${product.name}`,
          })),
        );
      })
      .catch((error) => {
        setItems([]);
        toast.error(error instanceof Error ? error.message : 'Could not load adjustments');
      })
      .finally(() => setLoading(false));
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
  const { unitOptions, defaultCode } = useInventoryUnits();
  const [items, setItems] = React.useState<MixerRecipeListItem[]>([]);
  const [runs, setRuns] = React.useState<ProductionBatchResult[]>([]);
  const [products, setProducts] = React.useState<InventoryProductListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [guideRecipe, setGuideRecipe] = React.useState<MixerRecipeListItem | null>(null);
  const [guideNonce, setGuideNonce] = React.useState(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MixerRecipeListItem | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState('');
  const [outputProductId, setOutputProductId] = React.useState('');
  const [outputQty, setOutputQty] = React.useState('1');
  const [status, setStatus] = React.useState<'active' | 'draft'>('draft');
  const [inputProductId, setInputProductId] = React.useState('');
  const [inputQty, setInputQty] = React.useState('1');
  const [inputUnit, setInputUnit] = React.useState('kg');
  const [recipeInputs, setRecipeInputs] = React.useState<
    { productId: string; quantity: number; unit: string }[]
  >([]);

  const load = React.useCallback(() => {
    setLoading(true);
    void Promise.all([
      inventoryApi.listMixerRecipes(),
      inventoryApi.listProductionRuns(),
      inventoryApi.listProducts({ page: 1, pageSize: 100, filter: 'active' }),
    ])
      .then(([recipes, production, productRes]) => {
        setItems(recipes.items);
        setRuns(production.items);
        setProducts(productRes.items);
      })
      .catch((error) => {
        setItems([]);
        setRuns([]);
        toast.error(error instanceof Error ? error.message : 'Could not load mixer data');
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.sku} — ${p.name}`,
  }));

  function openCreate() {
    setEditing(null);
    setName('');
    setOutputProductId('');
    setOutputQty('1');
    setStatus('draft');
    setRecipeInputs([]);
    setInputProductId('');
    setInputQty('1');
    setInputUnit(defaultCode('kg'));
    setDialogOpen(true);
  }

  function openEdit(recipe: MixerRecipeListItem) {
    setEditing(recipe);
    setName(recipe.name);
    setOutputProductId(recipe.outputProductId);
    setOutputQty(String(recipe.outputQty));
    setStatus(recipe.status);
    setRecipeInputs(
      recipe.inputs
        .filter((input) => input.productId)
        .map((input) => ({
          productId: input.productId!,
          quantity: input.quantity,
          unit: input.unit?.trim() || defaultCode('kg'),
        })),
    );
    setInputUnit(defaultCode('kg'));
    setDialogOpen(true);
  }

  function addInputLine() {
    const qty = Number(inputQty);
    if (!inputProductId || !Number.isFinite(qty) || qty <= 0) {
      toast.error('Pick a raw product and quantity');
      return;
    }
    setRecipeInputs((rows) => [...rows, { productId: inputProductId, quantity: qty, unit: inputUnit }]);
    setInputProductId('');
    setInputQty('1');
  }

  async function saveRecipe() {
    const qty = Number(outputQty);
    if (!name.trim() || !outputProductId || !Number.isInteger(qty) || qty < 1 || !recipeInputs.length) {
      toast.error('Name, output product, qty, and at least one input are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        outputProductId,
        outputQty: qty,
        status,
        inputs: recipeInputs,
      };
      if (editing) {
        await inventoryApi.updateMixerRecipe(editing.id, payload);
        toast.success('Recipe updated');
      } else {
        await inventoryApi.createMixerRecipe(payload);
        toast.success('Recipe created');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save recipe');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecipe(recipe: MixerRecipeListItem) {
    if (!window.confirm(`Delete recipe “${recipe.name}”?`)) return;
    try {
      await inventoryApi.deleteMixerRecipe(recipe.id);
      toast.success('Recipe deleted');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete recipe');
    }
  }

  function applyRecipe(recipe: MixerRecipeListItem) {
    setGuideRecipe(recipe);
    setGuideNonce((n) => n + 1);
    toast.success(`Loaded guide: ${recipe.name}`, {
      description: 'Output and raw materials filled — set costs and variant units, then run.',
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <InventoryPageLayout
      title="Mixer & production"
      description="Record raw materials in any unit (kg, g, L, pcs…) and how many of each variant you made — full hisab kept."
      actions={
        <Can permission="inventory.mixer">
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="size-3.5" />
            New recipe
          </Button>
        </Can>
      }
    >
      <ProductionBatchPanel
        guideRecipe={guideRecipe}
        guideNonce={guideNonce}
        onCompleted={() => load()}
      />

      <ProductionLedger runs={runs} />

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
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" size="sm" className="h-7" variant="outline" onClick={() => applyRecipe(recipe)}>
                      Use as guide
                    </Button>
                    <Can permission="inventory.mixer">
                      <Button type="button" size="sm" className="h-7" variant="ghost" onClick={() => openEdit(recipe)}>
                        Edit
                      </Button>
                      <Button type="button" size="sm" className="h-7" variant="ghost" onClick={() => void deleteRecipe(recipe)}>
                        Delete
                      </Button>
                    </Can>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit recipe' : 'New recipe'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Name" required className="sm:col-span-2">
              <FormInput value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Output product" required className="sm:col-span-2">
              <FormSearchSelect
                value={outputProductId}
                onChange={setOutputProductId}
                options={productOptions}
                placeholder="Select finished product…"
              />
            </FormField>
            <FormField label="Output qty" required>
              <FormInput type="number" min={1} value={outputQty} onChange={(e) => setOutputQty(e.target.value)} />
            </FormField>
            <FormField label="Status">
              <FormSearchSelect
                value={status}
                onChange={(v) => setStatus(v as 'active' | 'draft')}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Active' },
                ]}
                searchable={false}
              />
            </FormField>
            <div className="sm:col-span-2 space-y-2 rounded-md border border-border/60 p-3">
              <p className="text-xs font-medium text-muted-foreground">Inputs (any unit)</p>
              {recipeInputs.map((row, index) => {
                const product = products.find((p) => p.id === row.productId);
                return (
                  <div key={`${row.productId}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      {row.quantity} {row.unit} — {product?.name ?? row.productId}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setRecipeInputs((rows) => rows.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
              <div className="grid gap-2 sm:grid-cols-3">
                <FormSearchSelect
                  value={inputProductId}
                  onChange={setInputProductId}
                  options={productOptions}
                  placeholder="Raw product…"
                />
                <FormInput type="number" min={0.0001} step="any" value={inputQty} onChange={(e) => setInputQty(e.target.value)} />
                <FormSearchSelect
                  value={inputUnit || defaultCode('kg')}
                  onChange={setInputUnit}
                  options={unitOptions}
                  searchable={false}
                />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addInputLine}>
                Add input
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveRecipe()}>
              {saving ? 'Saving…' : editing ? 'Save recipe' : 'Create recipe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InventoryPageLayout>
  );
}
