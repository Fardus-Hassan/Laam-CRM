'use client';

import * as React from 'react';
import type { BulkActionId, OrderListRow } from '@laam/types';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { OrderBulkActions } from '@/features/orders/components/order-list/order-bulk-actions';
import { OrderSelectionSummary } from '@/features/orders/components/order-list/order-selection-summary';
import { ORDER_STICKY_ACTION_CLASS } from '@/features/orders/components/create-order/section-layout';
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
    <div className={cn(ORDER_STICKY_ACTION_CLASS, className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
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
          <OrderBulkActions
            variant="compact"
            actionIds={actionIds}
            selectedCount={selectedCount}
            selectedOrderIds={selectedOrderIds}
            onSuccess={onSuccess}
          />
        </div>
        <div className="w-full shrink-0 lg:max-w-[280px]">
          <OrderSelectionSummary rows={selectedRows} compact />
        </div>
      </div>
    </div>
  );
}
