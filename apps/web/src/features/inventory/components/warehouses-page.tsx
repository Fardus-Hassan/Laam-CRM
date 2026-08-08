'use client';

import * as React from 'react';
import type { InventoryProductDetail, InventoryProductListItem, Warehouse } from '@laam/types';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventoryResponsiveList } from '@/features/inventory/components/inventory-responsive-list';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

export function WarehousesPage() {
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [products, setProducts] = React.useState<InventoryProductListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Warehouse | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [isDefault, setIsDefault] = React.useState(false);
  const [isActive, setIsActive] = React.useState(true);

  const [fromWarehouseId, setFromWarehouseId] = React.useState('');
  const [toWarehouseId, setToWarehouseId] = React.useState('');
  const [productId, setProductId] = React.useState('');
  const [variantId, setVariantId] = React.useState('');
  const [variants, setVariants] = React.useState<InventoryProductDetail['variants']>([]);
  const [quantity, setQuantity] = React.useState('1');
  const [note, setNote] = React.useState('');
  const [transferring, setTransferring] = React.useState(false);
  const [repairing, setRepairing] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    void Promise.all([
      inventoryApi.listWarehouses(),
      inventoryApi.listProducts({ page: 1, pageSize: 100, filter: 'active' }),
    ])
      .then(([warehouseRes, productRes]) => {
        setWarehouses(warehouseRes.items);
        setProducts(productRes.items);
      })
      .catch((error) => {
        setWarehouses([]);
        toast.error(error instanceof Error ? error.message : 'Could not load warehouses');
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setCode('');
    setName('');
    setAddress('');
    setIsDefault(false);
    setIsActive(true);
    setDialogOpen(true);
  }

  function openEdit(warehouse: Warehouse) {
    setEditing(warehouse);
    setCode(warehouse.code);
    setName(warehouse.name);
    setAddress(warehouse.address ?? '');
    setIsDefault(warehouse.isDefault);
    setIsActive(warehouse.isActive);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await inventoryApi.updateWarehouse(editing.id, {
          code: code.trim(),
          name: name.trim(),
          address: address.trim() || undefined,
          isDefault: isDefault || undefined,
          isActive,
        });
        toast.success('Warehouse updated');
      } else {
        await inventoryApi.createWarehouse({
          code: code.trim(),
          name: name.trim(),
          address: address.trim() || undefined,
          isDefault: isDefault || undefined,
        });
        toast.success('Warehouse created');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save warehouse');
    } finally {
      setSaving(false);
    }
  }

  async function onProductChange(id: string) {
    setProductId(id);
    setVariantId('');
    setVariants([]);
    if (!id) return;
    const detail = await inventoryApi.getProduct(id);
    const nextVariants = detail?.variants ?? [];
    setVariants(nextVariants);
    setVariantId(nextVariants[0]?.id ?? '');
  }

  async function handleTransfer() {
    const qty = Number(quantity);
    if (!fromWarehouseId || !toWarehouseId || !productId || !variantId) {
      toast.error('Pick warehouses, product, and variant');
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast.error('Source and destination must differ');
      return;
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error('Quantity must be a positive whole number');
      return;
    }
    setTransferring(true);
    try {
      await inventoryApi.transferStock({
        fromWarehouseId,
        toWarehouseId,
        productId,
        variantId,
        quantity: qty,
        note: note.trim() || undefined,
      });
      toast.success('Stock transferred');
      setQuantity('1');
      setNote('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not transfer stock');
    } finally {
      setTransferring(false);
    }
  }

  async function repairWarehouseStock() {
    setRepairing(true);
    try {
      const result = await inventoryApi.repairWarehouseStock();
      toast.success(
        result.repaired > 0
          ? `Synced ${result.repaired} variant(s) to warehouse on-hand`
          : 'All variants already aligned with warehouse',
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sync warehouse stock');
    } finally {
      setRepairing(false);
    }
  }

  const warehouseOptions = warehouses
    .filter((w) => w.isActive)
    .map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` }));

  const productOptions = products.map((p) => ({ value: p.id, label: `${p.sku} — ${p.name}` }));

  const variantOptions = variants.map((v) => ({
    value: v.id,
    label: `${v.label} · ${v.sku} (${v.stock} in stock)`,
  }));

  return (
    <PageShell title="Inventory" description="Warehouses and stock transfers between locations.">
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <InventorySubNav />
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">Warehouses</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Storage locations — move stock between them with a full audit trail.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
            <Can permission="inventory.adjust">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={repairing}
                onClick={() => void repairWarehouseStock()}
              >
                {repairing ? 'Syncing…' : 'Sync catalog → warehouse'}
              </Button>
            </Can>
            <Can permission="inventory.warehouses">
              <Button type="button" size="sm" onClick={openCreate}>
                <Plus className="size-3.5" />
                Add warehouse
              </Button>
            </Can>
          </div>
        </div>

        <InventoryResponsiveList
          loading={loading}
          emptyTitle="No warehouses"
          emptyDescription="Add a warehouse to track stock by location."
          headers={['Code', 'Name', 'Address', 'SKUs', 'Units', 'Status', '']}
          rows={warehouses.map((w) => ({
            id: w.id,
            cells: [
              <span key="c" className="whitespace-nowrap font-mono font-medium">{w.code}</span>,
              <div key="n" className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{w.name}</span>
                {w.isDefault ? <Badge variant="secondary">Default</Badge> : null}
              </div>,
              <span key="a" className="max-w-[14rem] truncate text-muted-foreground">{w.address ?? '—'}</span>,
              <span key="s" className="tabular-nums">{w.skuCount ?? '—'}</span>,
              <span key="u" className="tabular-nums">{w.totalUnits ?? '—'}</span>,
              <Badge key="st" variant={w.isActive ? 'default' : 'secondary'}>
                {w.isActive ? 'Active' : 'Inactive'}
              </Badge>,
              <Can key="e" permission="inventory.warehouses">
                <Button type="button" size="sm" variant="outline" onClick={() => openEdit(w)}>
                  Edit
                </Button>
              </Can>,
            ],
          }))}
        />

        <Can permission="inventory.adjust">
        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Transfer stock</CardTitle>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3')}>
            <FormField label="From warehouse" required>
              <FormSearchSelect
                value={fromWarehouseId}
                onChange={setFromWarehouseId}
                options={warehouseOptions}
                placeholder="Source…"
                searchable={false}
              />
            </FormField>
            <FormField label="To warehouse" required>
              <FormSearchSelect
                value={toWarehouseId}
                onChange={setToWarehouseId}
                options={warehouseOptions}
                placeholder="Destination…"
                searchable={false}
              />
            </FormField>
            <FormField label="Product" required>
              <FormSearchSelect
                value={productId}
                onChange={(v) => void onProductChange(v)}
                options={productOptions}
                placeholder="Select product…"
              />
            </FormField>
            <FormField label="Variant" required>
              <FormSearchSelect
                value={variantId}
                onChange={setVariantId}
                options={variantOptions}
                placeholder={productId ? 'Select variant…' : 'Pick product first'}
                disabled={!productId}
              />
            </FormField>
            <FormField label="Quantity" required>
              <FormInput
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </FormField>
            <FormField label="Note">
              <FormInput
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note"
              />
            </FormField>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="button" disabled={transferring} onClick={() => void handleTransfer()}>
                {transferring ? 'Transferring…' : 'Transfer stock'}
              </Button>
            </div>
          </CardContent>
        </Card>
        </Can>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit warehouse' : 'Add warehouse'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Code" required>
                <FormInput
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="MAIN"
                />
              </FormField>
              <FormField label="Name" required>
                <FormInput value={name} onChange={(e) => setName(e.target.value)} />
              </FormField>
              <FormField label="Address" className="sm:col-span-2">
                <FormInput value={address} onChange={(e) => setAddress(e.target.value)} />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={isDefault}
                  onCheckedChange={(value) => setIsDefault(value === true)}
                />
                Default warehouse
              </label>
              {editing ? (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={isActive}
                    onCheckedChange={(value) => setIsActive(value === true)}
                  />
                  Active
                </label>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create warehouse'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  );
}
