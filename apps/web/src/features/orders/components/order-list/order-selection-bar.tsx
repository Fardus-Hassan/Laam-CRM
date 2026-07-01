'use client';

import * as React from 'react';
import type { BulkActionId, OrderListRow } from '@laam/types';
import { X } from 'lucide-react';

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
        'border-b border-border/70 bg-muted/25 px-4 py-3',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">
          {selectedCount} order{selectedCount === 1 ? '' : 's'} selected
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onClearSelection}
        >
          <X className="size-3.5" />
          Clear
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
