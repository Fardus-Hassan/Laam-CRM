'use client';

import type { BulkActionId, OrderListRow } from '@laam/types';
import { CheckSquare, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { OrderBulkActions } from '@/features/orders/components/order-list/order-bulk-actions';
import { OrderSelectionSummary } from '@/features/orders/components/order-list/order-selection-summary';
import { cn } from '@/lib/utils';

type OrderSelectionBarProps = {
  selectedCount: number;
  selectedOrderIds: string[];
  selectedRows: OrderListRow[];
  actionIds: BulkActionId[];
  onClearSelection: () => void;
  onSuccess?: () => void;
  className?: string;
};

export function OrderSelectionBar({
  selectedCount,
  selectedOrderIds,
  selectedRows,
  actionIds,
  onClearSelection,
  onSuccess,
  className,
}: OrderSelectionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

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
          order{selectedCount === 1 ? '' : 's'} selected
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
        <OrderBulkActions
          variant="compact"
          actionIds={actionIds}
          selectedCount={selectedCount}
          selectedOrderIds={selectedOrderIds}
          selectedRows={selectedRows}
          onSuccess={onSuccess}
        />
      </div>
      <div className="mt-3">
        <OrderSelectionSummary rows={selectedRows} variant="inline" />
      </div>
    </div>
  );
}
