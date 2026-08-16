'use client';

import * as React from 'react';
import type { InventoryProductListItem } from '@laam/types';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  bulkActionToModal,
  ProductBulkModals,
  runProductBulkAction,
} from '@/features/inventory/components/product-list/modals/product-bulk-modals';
import {
  PRODUCT_BULK_ACTIONS,
  type ProductBulkActionId,
} from '@/features/inventory/config/product-bulk-actions';
import { useProductMutations } from '@/features/inventory/hooks/use-product-mutations';
import { downloadCsvAndExcel } from '@/lib/export-csv';
import { cn } from '@/lib/utils';

type ProductBulkActionsProps = {
  selectedCount: number;
  selectedProductIds: string[];
  selectedRows: InventoryProductListItem[];
  onSuccess?: () => void;
  className?: string;
};

export function ProductBulkActions({
  selectedCount,
  selectedProductIds,
  selectedRows,
  onSuccess,
  className,
}: ProductBulkActionsProps) {
  const { bulkAction, isLoading } = useProductMutations();
  const [bulkModal, setBulkModal] = React.useState<ReturnType<typeof bulkActionToModal>>(null);

  function handleAction(actionId: ProductBulkActionId) {
    runProductBulkAction(actionId, selectedProductIds, {
      openModal: setBulkModal,
      bulkAction: async (payload) => {
        await bulkAction(payload);
        onSuccess?.();
      },
      exportRows: () => {
        if (selectedRows.length === 0) {
          toast.error('No rows to export');
          return;
        }
        downloadCsvAndExcel(
          `products-export-${Date.now()}`,
          ['SKU', 'Name', 'Category', 'Stock', 'Status', 'Sale Price', 'Supplier'],
          selectedRows.map((row) => [
            row.sku,
            row.name,
            row.category,
            row.stock,
            row.status,
            row.salePriceMin,
            row.supplierName ?? '',
          ]),
        );
        toast.success(`Exported ${selectedRows.length} product(s) as CSV and Excel`);
        onSuccess?.();
      },
    });
  }

  return (
    <>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {PRODUCT_BULK_ACTIONS.map((action) => (
          <Button
            key={action.id}
            type="button"
            size="sm"
            variant={action.variant === 'secondary' ? 'secondary' : 'outline'}
            disabled={(action.requiresSelection && selectedCount === 0) || isLoading}
            onClick={() => handleAction(action.id)}
          >
            {action.label}
          </Button>
        ))}
      </div>
      <ProductBulkModals
        state={bulkModal}
        onClose={() => setBulkModal(null)}
        onSuccess={onSuccess}
      />
    </>
  );
}
