'use client';

import type { InventoryProductListItem } from '@laam/types';
import { CheckSquare, X } from 'lucide-react';

import { Can } from '@/components/auth/can';
import { Button } from '@/components/ui/button';
import { ProductBulkActions } from '@/features/inventory/components/product-list/product-bulk-actions';
import { cn } from '@/lib/utils';

type ProductSelectionBarProps = {
  selectedCount: number;
  selectedProductIds: string[];
  selectedRows: InventoryProductListItem[];
  onClearSelection: () => void;
  onSuccess?: () => void;
  className?: string;
};

export function ProductSelectionBar({
  selectedCount,
  selectedProductIds,
  selectedRows,
  onClearSelection,
  onSuccess,
  className,
}: ProductSelectionBarProps) {
  if (selectedCount === 0) return null;

  const lowStock = selectedRows.filter((r) => r.stockStatus !== 'in_stock').length;
  const totalStock = selectedRows.reduce((s, r) => s + r.stock, 0);

  return (
    <div
      className={cn(
        'border-b border-primary/25 border-l-4 border-l-primary bg-primary/5 px-4 py-3',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-background/80 px-2 py-1 text-xs font-semibold text-primary">
          <CheckSquare className="size-3.5" />
          <span className="tabular-nums">{selectedCount}</span>
          product{selectedCount === 1 ? '' : 's'} selected
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={onClearSelection}
        >
          <X className="size-3.5" />
          Clear selection
        </Button>
      </div>
      <div className="mt-2.5">
        <Can permission="inventory.edit">
          <ProductBulkActions
            selectedCount={selectedCount}
            selectedProductIds={selectedProductIds}
            selectedRows={selectedRows}
            onSuccess={onSuccess}
          />
        </Can>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs">
        <span className="font-medium text-muted-foreground">Selection summary</span>
        <span>
          Total stock <strong className="tabular-nums text-foreground">{totalStock}</strong>
        </span>
        <span>
          Low/out <strong className="tabular-nums text-foreground">{lowStock}</strong>
        </span>
      </div>
    </div>
  );
}
