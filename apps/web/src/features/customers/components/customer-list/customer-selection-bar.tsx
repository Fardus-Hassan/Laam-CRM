'use client';

import * as React from 'react';
import type { CustomerListItem } from '@laam/types';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CustomerBulkActions } from '@/features/customers/components/customer-list/customer-bulk-actions';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type CustomerSelectionBarProps = {
  selectedCount: number;
  selectedCustomerIds: string[];
  selectedRows: CustomerListItem[];
  onClearSelection: () => void;
  onSuccess?: () => void;
  className?: string;
};

export function CustomerSelectionBar({
  selectedCount,
  selectedCustomerIds,
  selectedRows,
  onClearSelection,
  onSuccess,
  className,
}: CustomerSelectionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  const totalSpent = selectedRows.reduce((sum, row) => sum + row.totalSpent, 0);
  const avgCourier =
    selectedRows.length > 0
      ? selectedRows.reduce((sum, row) => sum + row.courierScore.rate, 0) / selectedRows.length
      : 0;

  return (
    <div className={cn('border-b border-border/70 bg-muted/25 px-4 py-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">
          {selectedCount} customer{selectedCount === 1 ? '' : 's'} selected
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
        <CustomerBulkActions
          selectedCount={selectedCount}
          selectedCustomerIds={selectedCustomerIds}
          selectedRows={selectedRows}
          onSuccess={onSuccess}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs">
        <span className="font-medium text-muted-foreground">Selection summary</span>
        <span>
          Total spent{' '}
          <strong className="tabular-nums text-foreground">{formatCurrency(totalSpent)}</strong>
        </span>
        <span>
          Avg courier{' '}
          <strong className="tabular-nums text-foreground">{avgCourier.toFixed(1)}%</strong>
        </span>
      </div>
    </div>
  );
}
