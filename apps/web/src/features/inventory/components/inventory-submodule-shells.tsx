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
import { Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { CrmDataTablePagination } from '@/components/data-table/crm-data-table-pagination';
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
  DialogDescription,
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
import { formatCurrency, formatDate } from '@/lib/format';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import { cn } from '@/lib/utils';

const INV_LIST_PAGE_SIZES = [10, 25, 50, 100];
const INV_LIST_DEFAULT_PAGE_SIZE = 25;

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
  const { confirm, confirmDialog } = useConfirmDialog();
  const [search, setSearch] = React.useState('');
  const [items, setItems] = React.useState<SupplierListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(INV_LIST_DEFAULT_PAGE_SIZE);
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

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  const load = React.useCallback(() => {
    setLoading(true);
    void inventoryApi
      .listSuppliers({ search, page, pageSize })
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
        if (r.page) setPage(r.page);
        if (r.pageSize) setPageSize(r.pageSize);
      })
      .catch((error) => {
        setItems([]);
        setTotal(0);
        toast.error(error instanceof Error ? error.message : 'Could not load suppliers');
      })
      .finally(() => setLoading(false));
  }, [search, page, pageSize]);

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
    const ok = await confirm({
      title: `Delete ${supplier.name}?`,
      description: 'This supplier will be permanently removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
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

      {total > 0 ? (
        <CrmDataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={INV_LIST_PAGE_SIZES}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}

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
      {confirmDialog}
    </InventoryPageLayout>
  );
}

export function PurchaseListShell() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(INV_LIST_DEFAULT_PAGE_SIZE);
  const [data, setData] = React.useState<{
    items: PurchaseListItem[];
    total: number;
    summary: { unpaidTotal: number; pendingReceipt: number };
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  React.useEffect(() => {
    setLoading(true);
    void inventoryApi
      .listPurchases({ search, page, pageSize })
      .then((res) =>
        setData({
          items: res.items,
          total: res.total,
          summary: res.summary,
        }),
      )
      .catch((error) => {
        setData(null);
        toast.error(error instanceof Error ? error.message : 'Could not load purchases');
      })
      .finally(() => setLoading(false));
  }, [search, page, pageSize]);

  async function cancelPurchase(p: PurchaseListItem) {
    const ok = await confirm({
      title: `Cancel ${p.purchaseNumber}?`,
      description: 'The purchase order will be cancelled.',
      confirmLabel: 'Cancel purchase',
      destructive: true,
    });
    if (!ok) return;
    try {
      await inventoryApi.cancelPurchase(p.id);
      toast.success(`${p.purchaseNumber} cancelled`);
      setData(
        await inventoryApi.listPurchases({ search, page, pageSize }).then((res) => ({
          items: res.items,
          total: res.total,
          summary: res.summary,
        })),
      );
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
          { id: 'count', label: 'Orders', value: data ? String(data.total) : '—' },
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
              {p.stockStatus === 'pending' || p.stockStatus === 'partial' ? (
                <>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/inventory/purchase/${p.id}`}>
                      {p.stockStatus === 'partial' ? 'Receive more' : 'Receive'}
                    </Link>
                  </Button>
                  {p.stockStatus === 'pending' ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => void cancelPurchase(p)}>
                      Cancel
                    </Button>
                  ) : null}
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
                {p.stockStatus === 'pending' || p.stockStatus === 'partial' ? (
                  <>
                    <Button type="button" size="sm" variant="outline" className="w-full" asChild>
                      <Link href={`/dashboard/inventory/purchase/${p.id}`}>
                        {p.stockStatus === 'partial' ? 'Receive more' : 'Receive stock'}
                      </Link>
                    </Button>
                    {p.stockStatus === 'pending' ? (
                      <Button type="button" size="sm" variant="ghost" className="w-full" onClick={() => void cancelPurchase(p)}>
                        Cancel
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          ),
        }))}
      />
      {data && data.total > 0 ? (
        <CrmDataTablePagination
          page={page}
          pageSize={pageSize}
          total={data.total}
          pageSizeOptions={INV_LIST_PAGE_SIZES}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}
      {confirmDialog}
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
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(INV_LIST_DEFAULT_PAGE_SIZE);
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

  const loadList = React.useCallback(() => {
    setLoading(true);
    void inventoryApi
      .listPurchaseReturns({ page, pageSize })
      .then((returns) => {
        setItems(returns.items);
        setTotal(returns.total);
        if (returns.page) setPage(returns.page);
        if (returns.pageSize) setPageSize(returns.pageSize);
      })
      .catch((error) => {
        setItems([]);
        setTotal(0);
        toast.error(error instanceof Error ? error.message : 'Could not load purchase returns');
      })
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  const loadFormOptions = React.useCallback(() => {
    void Promise.all([
      inventoryApi.listPurchases({ page: 1, pageSize: 100 }),
      inventoryApi.listProducts({ page: 1, pageSize: 100, filter: 'active' }),
    ])
      .then(([purchaseRes, productRes]) => {
        setPurchases(purchaseRes.items);
        setProducts(productRes.items);
      })
      .catch(() => {
        setPurchases([]);
        setProducts([]);
      });
  }, []);

  React.useEffect(() => {
    loadList();
  }, [loadList]);

  React.useEffect(() => {
    loadFormOptions();
  }, [loadFormOptions]);

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
      loadList();
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
      loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve return');
    }
  }

  async function completeReturn(item: PurchaseReturnListItem) {
    try {
      await inventoryApi.completePurchaseReturn(item.id);
      toast.success(`${item.returnNumber} completed — stock deducted`);
      loadList();
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
      {total > 0 ? (
        <CrmDataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={INV_LIST_PAGE_SIZES}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}
    </InventoryPageLayout>
  );
}

export function AdjustmentListShell() {
  const { createAdjustment, isLoading } = useProductMutations();
  const [items, setItems] = React.useState<StockAdjustmentListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(INV_LIST_DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = React.useState(true);
  const [productId, setProductId] = React.useState('');
  const [delta, setDelta] = React.useState('1');
  const [reason, setReason] = React.useState<keyof typeof ADJUSTMENT_REASON_LABELS>('count_correction');
  const [note, setNote] = React.useState('');
  const [productOptions, setProductOptions] = React.useState<
    { value: string; label: string }[]
  >([]);

  const loadHistory = React.useCallback(() => {
    setLoading(true);
    void inventoryApi
      .listAdjustments({ page, pageSize })
      .then((adjustments) => {
        setItems(adjustments.items);
        setTotal(adjustments.total);
        if (adjustments.page) setPage(adjustments.page);
        if (adjustments.pageSize) setPageSize(adjustments.pageSize);
      })
      .catch((error) => {
        setItems([]);
        setTotal(0);
        toast.error(error instanceof Error ? error.message : 'Could not load adjustments');
      })
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  React.useEffect(() => {
    void inventoryApi
      .listProducts({ page: 1, pageSize: 100 })
      .then((products) => {
        setProductOptions(
          products.items.map((product) => ({
            value: product.id,
            label: `${product.sku} — ${product.name}`,
          })),
        );
      })
      .catch(() => setProductOptions([]));
  }, []);

  async function handleAdjust() {
    const d = Number(delta);
    if (!productId || !Number.isFinite(d) || d === 0) return;
    await createAdjustment({ productId, delta: d, reason, note: note || undefined });
    setNote('');
    loadHistory();
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
        <Button type="button" size="sm" variant="outline" onClick={loadHistory}>
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
            formatDate(a.adjustedAt),
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
                <span>{formatDate(a.adjustedAt)}</span>
              </div>
            </div>
          ),
        }))}
      />
      {total > 0 ? (
        <CrmDataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          pageSizeOptions={INV_LIST_PAGE_SIZES}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}
    </InventoryPageLayout>
  );
}

export function MixerListShell() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const { defaultCode, units } = useInventoryUnits();
  const [items, setItems] = React.useState<MixerRecipeListItem[]>([]);
  const [recipesTotal, setRecipesTotal] = React.useState(0);
  const [recipesPage, setRecipesPage] = React.useState(1);
  const [recipesPageSize, setRecipesPageSize] = React.useState(INV_LIST_DEFAULT_PAGE_SIZE);
  const [runs, setRuns] = React.useState<ProductionBatchResult[]>([]);
  const [runsTotal, setRunsTotal] = React.useState(0);
  const [runsPage, setRunsPage] = React.useState(1);
  const [runsPageSize, setRunsPageSize] = React.useState(INV_LIST_DEFAULT_PAGE_SIZE);
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

  const loadRecipes = React.useCallback(() => {
    setLoading(true);
    void inventoryApi
      .listMixerRecipes({ page: recipesPage, pageSize: recipesPageSize })
      .then((recipes) => {
        setItems(recipes.items);
        setRecipesTotal(recipes.total);
        if (recipes.page) setRecipesPage(recipes.page);
        if (recipes.pageSize) setRecipesPageSize(recipes.pageSize);
      })
      .catch((error) => {
        setItems([]);
        setRecipesTotal(0);
        toast.error(error instanceof Error ? error.message : 'Could not load mixer recipes');
      })
      .finally(() => setLoading(false));
  }, [recipesPage, recipesPageSize]);

  const loadRuns = React.useCallback(
    (page = runsPage, pageSize = runsPageSize) => {
      void inventoryApi
        .listProductionRuns({ page, pageSize })
        .then((production) => {
          setRuns(production.items);
          setRunsTotal(production.total);
          setRunsPage(production.page ?? page);
          setRunsPageSize(production.pageSize ?? pageSize);
        })
        .catch(() => {
          setRuns([]);
          setRunsTotal(0);
        });
    },
    [runsPage, runsPageSize],
  );

  React.useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  React.useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  React.useEffect(() => {
    void inventoryApi
      .listProducts({ page: 1, pageSize: 100, filter: 'active' })
      .then((productRes) => setProducts(productRes.items))
      .catch(() => setProducts([]));
  }, []);

  function reloadAll() {
    loadRecipes();
    loadRuns();
  }

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
    const existing = recipeInputs.findIndex((r) => r.productId === inputProductId);
    if (existing >= 0) {
      setRecipeInputs((rows) =>
        rows.map((row, i) =>
          i === existing ? { ...row, quantity: row.quantity + qty, unit: inputUnit } : row,
        ),
      );
    } else {
      setRecipeInputs((rows) => [
        ...rows,
        { productId: inputProductId, quantity: qty, unit: inputUnit },
      ]);
    }
    setInputProductId('');
    setInputQty('1');
  }

  function onPickInputProduct(productId: string) {
    setInputProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product?.primaryBaseUomCode) {
      setInputUnit(defaultCode(product.primaryBaseUomCode));
    }
  }

  const recipeFormulaPreview = React.useMemo(() => {
    if (!recipeInputs.length) return null;
    const materials = recipeInputs
      .map((row) => {
        const product = products.find((p) => p.id === row.productId);
        return `${row.quantity}${row.unit} ${product?.name ?? 'Material'}`;
      })
      .join(' + ');
    const output = products.find((p) => p.id === outputProductId);
    const outLabel = output ? `${outputQty || '?'}× ${output.name}` : `${outputQty || '?'}× finished`;
    return `${materials} → ${outLabel}`;
  }, [recipeInputs, products, outputProductId, outputQty]);

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
      reloadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save recipe');
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecipe(recipe: MixerRecipeListItem) {
    const ok = await confirm({
      title: `Delete recipe “${recipe.name}”?`,
      description: 'This saved recipe will be permanently removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await inventoryApi.deleteMixerRecipe(recipe.id);
      toast.success('Recipe deleted');
      reloadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete recipe');
    }
  }

  function applyRecipe(recipe: MixerRecipeListItem) {
    setGuideRecipe(recipe);
    setGuideNonce((n) => n + 1);
    toast.success(`Loaded recipe: ${recipe.name}`, {
      description: 'Materials scale with pack quantities. Pick warehouse, then save.',
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <InventoryPageLayout
      title="Mixer & production"
      description="Multi-material recipes → finished packs (500g, 1kg…). Stock moves from the selected warehouse."
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
        recipes={items}
        onCompleted={() => {
          loadRuns(1, runsPageSize);
          loadRecipes();
        }}
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Recipes</h3>
            <span className="text-[11px] text-muted-foreground">{recipesTotal} saved</span>
          </div>
          {loading ? (
            <div className="h-28 animate-pulse rounded-xl border bg-muted/40" />
          ) : !items.length ? (
            <Card className={ORDER_CARD_CLASS}>
              <CardContent className="p-4">
                <p className="text-center text-sm text-muted-foreground">
                  No recipes yet — create one for your mix (e.g. honey + kalojira).
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/70">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-[11px] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Recipe</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">Output</th>
                    <th className="px-3 py-2 font-medium">Materials</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((recipe) => (
                    <tr key={recipe.id} className="border-t border-border/50">
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium">{recipe.name}</span>
                          <Badge
                            variant={recipe.status === 'active' ? 'default' : 'secondary'}
                            className="shrink-0"
                          >
                            {recipe.status}
                          </Badge>
                        </div>
                        {recipe.lastMixedAt ? (
                          <p className="text-[10px] text-muted-foreground">
                            Last {formatDate(recipe.lastMixedAt)}
                          </p>
                        ) : null}
                      </td>
                      <td className="hidden px-3 py-2 sm:table-cell">
                        <span className="font-medium tabular-nums">{recipe.outputQty}×</span>{' '}
                        <span className="text-muted-foreground">{recipe.outputProductName}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {recipe.inputCount} items
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7"
                            variant="outline"
                            onClick={() => applyRecipe(recipe)}
                          >
                            Use
                          </Button>
                          <Can permission="inventory.mixer">
                            <Button
                              type="button"
                              size="sm"
                              className="h-7"
                              variant="ghost"
                              onClick={() => openEdit(recipe)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7"
                              variant="ghost"
                              onClick={() => void deleteRecipe(recipe)}
                            >
                              Delete
                            </Button>
                          </Can>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {recipesTotal > 0 ? (
            <CrmDataTablePagination
              page={recipesPage}
              pageSize={recipesPageSize}
              total={recipesTotal}
              pageSizeOptions={INV_LIST_PAGE_SIZES}
              onPageChange={setRecipesPage}
              onPageSizeChange={(size) => {
                setRecipesPageSize(size);
                setRecipesPage(1);
              }}
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <ProductionLedger runs={runs} total={runsTotal} />
          {runsTotal > 0 ? (
            <CrmDataTablePagination
              page={runsPage}
              pageSize={runsPageSize}
              total={runsTotal}
              pageSizeOptions={INV_LIST_PAGE_SIZES}
              onPageChange={setRunsPage}
              onPageSizeChange={(size) => {
                setRunsPageSize(size);
                setRunsPage(1);
              }}
            />
          ) : null}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="gap-0 overflow-visible p-0 sm:max-w-xl">
          <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
            <DialogTitle>{editing ? 'Edit recipe' : 'New recipe'}</DialogTitle>
            <DialogDescription>
              Save a mix template. When you use it later, materials scale with pack quantities.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(72vh,620px)] space-y-4 overflow-y-auto overflow-x-visible px-5 py-4">
            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                1. Finished product
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Recipe name" required className="sm:col-span-2">
                  <FormInput
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Modho kalo Jira mix"
                  />
                </FormField>
                <FormField label="Output product" required className="sm:col-span-2">
                  <FormSearchSelect
                    value={outputProductId}
                    onChange={(id) => {
                      setOutputProductId(id);
                      if (!name.trim()) {
                        const product = products.find((p) => p.id === id);
                        if (product) setName(`${product.name} recipe`);
                      }
                    }}
                    options={productOptions}
                    placeholder="Select finished product…"
                    portal
                  />
                </FormField>
                <FormField
                  label="Base output qty"
                  required
                  hint="Scales with pack quantities on production."
                >
                  <FormInput
                    type="number"
                    min={1}
                    value={outputQty}
                    onChange={(e) => setOutputQty(e.target.value)}
                  />
                </FormField>
                <FormField label="Status">
                  <div className="flex h-8 overflow-hidden rounded-md border border-border/70">
                    {(
                      [
                        { value: 'draft', label: 'Draft' },
                        { value: 'active', label: 'Active' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={cn(
                          'flex-1 text-sm transition-colors',
                          status === opt.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background text-muted-foreground hover:bg-muted/50',
                        )}
                        onClick={() => setStatus(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </FormField>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-end justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  2. Raw materials
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {recipeInputs.length} item{recipeInputs.length === 1 ? '' : 's'}
                </span>
              </div>

              {recipeInputs.length ? (
                <ul className="divide-y divide-border/50 rounded-md border border-border/70">
                  {recipeInputs.map((row, index) => {
                    const product = products.find((p) => p.id === row.productId);
                    return (
                      <li
                        key={`${row.productId}-${index}`}
                        className="flex items-center gap-2 bg-background/40 px-2.5 py-1.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {product?.name ?? 'Material'}
                          </p>
                          {product?.sku ? (
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {product.sku}
                            </p>
                          ) : null}
                        </div>
                        <FormInput
                          type="number"
                          min={0.0001}
                          step="any"
                          className="h-8 w-[4.5rem]"
                          value={String(row.quantity)}
                          onChange={(e) => {
                            const qty = Number(e.target.value);
                            setRecipeInputs((rows) =>
                              rows.map((r, i) =>
                                i === index
                                  ? {
                                      ...r,
                                      quantity: Number.isFinite(qty) && qty > 0 ? qty : r.quantity,
                                    }
                                  : r,
                              ),
                            );
                          }}
                        />
                        <select
                          className="h-8 w-16 shrink-0 rounded-md border border-input bg-background px-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={row.unit}
                          onChange={(e) =>
                            setRecipeInputs((rows) =>
                              rows.map((r, i) =>
                                i === index ? { ...r, unit: e.target.value } : r,
                              ),
                            )
                          }
                          aria-label="Unit"
                        >
                          {units.map((u) => (
                            <option key={u.code} value={u.code}>
                              {u.code}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setRecipeInputs((rows) => rows.filter((_, i) => i !== index))
                          }
                          aria-label="Remove material"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="rounded-md border border-dashed border-border/70 px-3 py-3 text-center text-xs text-muted-foreground">
                  No materials yet. Add each raw product below.
                </div>
              )}

              <div className="rounded-md border border-border/70 bg-muted/20 p-2.5">
                <p className="mb-2 text-[11px] font-medium text-muted-foreground">Add material</p>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_4rem_auto]">
                  <FormSearchSelect
                    value={inputProductId}
                    onChange={onPickInputProduct}
                    options={productOptions}
                    placeholder="Raw product…"
                    portal
                  />
                  <FormInput
                    type="number"
                    min={0.0001}
                    step="any"
                    value={inputQty}
                    onChange={(e) => setInputQty(e.target.value)}
                    placeholder="Qty"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addInputLine();
                      }
                    }}
                  />
                  <select
                    className="h-8 w-full rounded-md border border-input bg-background px-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={inputUnit || defaultCode('kg')}
                    onChange={(e) => setInputUnit(e.target.value)}
                    aria-label="Unit"
                  >
                    {units.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.code}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" className="h-8" onClick={addInputLine}>
                    <Plus className="size-3.5" />
                    Add
                  </Button>
                </div>
              </div>
            </section>

            {recipeFormulaPreview ? (
              <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Formula: </span>
                {recipeFormulaPreview}
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-border/60 px-5 py-3 sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveRecipe()}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create recipe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </InventoryPageLayout>
  );
}
