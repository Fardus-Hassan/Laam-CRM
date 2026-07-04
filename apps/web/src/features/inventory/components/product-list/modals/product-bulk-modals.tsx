'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ProductBulkActionId } from '@/features/inventory/config/product-bulk-actions';
import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_STATUS_LABELS,
} from '@/features/inventory/config/product-filters';
import type { InventoryApi } from '@/features/inventory/api/inventory-api';
import { useProductMutations } from '@/features/inventory/hooks/use-product-mutations';
import type { ProductCategory, ProductStatus } from '@laam/types';

type ProductBulkModalState =
  | { type: 'set_status'; productIds: string[] }
  | { type: 'set_category'; productIds: string[] }
  | { type: 'adjust_stock'; productIds: string[] }
  | null;

export function bulkActionToModal(
  actionId: ProductBulkActionId,
  productIds: string[],
): ProductBulkModalState {
  if (actionId === 'set_status') return { type: 'set_status', productIds };
  if (actionId === 'set_category') return { type: 'set_category', productIds };
  if (actionId === 'adjust_stock') return { type: 'adjust_stock', productIds };
  return null;
}

const STATUS_OPTIONS = (Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[]).map((value) => ({
  value,
  label: PRODUCT_STATUS_LABELS[value],
}));

const CATEGORY_OPTIONS = (Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).map(
  (value) => ({ value, label: PRODUCT_CATEGORY_LABELS[value] }),
);

export function ProductBulkModals({
  state,
  onClose,
  onSuccess,
}: {
  state: ProductBulkModalState;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { bulkAction, isLoading } = useProductMutations();
  const [status, setStatus] = React.useState<ProductStatus>('active');
  const [category, setCategory] = React.useState<ProductCategory>('other');
  const [stockDelta, setStockDelta] = React.useState('5');

  if (!state) return null;

  async function handleStatus() {
    if (state?.type !== 'set_status') return;
    await bulkAction({ productIds: state.productIds, status });
    onSuccess?.();
    onClose();
  }

  async function handleCategory() {
    if (state?.type !== 'set_category') return;
    await bulkAction({ productIds: state.productIds, category });
    onSuccess?.();
    onClose();
  }

  async function handleStock() {
    if (state?.type !== 'adjust_stock') return;
    const delta = Number(stockDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error('Enter a valid stock change');
      return;
    }
    await bulkAction({ productIds: state.productIds, stockDelta: delta });
    onSuccess?.();
    onClose();
  }

  if (state.type === 'set_status') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set status ({state.productIds.length})</DialogTitle>
          </DialogHeader>
          <FormField label="Status">
            <FormSearchSelect
              value={status}
              onChange={(v) => setStatus(v as ProductStatus)}
              options={STATUS_OPTIONS}
              searchable={false}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" disabled={isLoading} onClick={() => void handleStatus()}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (state.type === 'set_category') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set category ({state.productIds.length})</DialogTitle>
          </DialogHeader>
          <FormField label="Category">
            <FormSearchSelect
              value={category}
              onChange={(v) => setCategory(v as ProductCategory)}
              options={CATEGORY_OPTIONS}
              searchable={false}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" disabled={isLoading} onClick={() => void handleCategory()}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock ({state.productIds.length})</DialogTitle>
        </DialogHeader>
        <FormField label="Change (+ or −)">
          <input
            type="number"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={stockDelta}
            onChange={(e) => setStockDelta(e.target.value)}
          />
        </FormField>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={isLoading} onClick={() => void handleStock()}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function runProductBulkAction(
  actionId: ProductBulkActionId,
  productIds: string[],
  handlers: {
    openModal: (state: ProductBulkModalState) => void;
    bulkAction: (payload: Parameters<InventoryApi['bulkProductAction']>[0]) => Promise<void>;
    exportRows: () => void;
  },
) {
  if (actionId === 'export') {
    handlers.exportRows();
    return;
  }
  const modal = bulkActionToModal(actionId, productIds);
  if (modal) handlers.openModal(modal);
}
