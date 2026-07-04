'use client';

import * as React from 'react';
import type { ContactListItem } from '@laam/types';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ContactBulkActions } from '@/features/contacts/components/contact-list/contact-bulk-actions';
import { cn } from '@/lib/utils';

type ContactSelectionBarProps = {
  selectedCount: number;
  selectedContactIds: string[];
  selectedRows: ContactListItem[];
  onClearSelection: () => void;
  onSuccess?: () => void;
  className?: string;
};

export function ContactSelectionBar({
  selectedCount,
  selectedContactIds,
  selectedRows,
  onClearSelection,
  onSuccess,
  className,
}: ContactSelectionBarProps) {
  if (selectedCount === 0) return null;

  const customerCount = selectedRows.filter((r) => r.contactType === 'customer').length;
  const avgCourier =
    selectedRows.filter((r) => r.courierScore).length > 0
      ? selectedRows
          .filter((r) => r.courierScore)
          .reduce((sum, row) => sum + (row.courierScore?.rate ?? 0), 0) /
        selectedRows.filter((r) => r.courierScore).length
      : 0;

  return (
    <div className={cn('border-b border-border/70 bg-muted/25 px-4 py-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">
          {selectedCount} contact{selectedCount === 1 ? '' : 's'} selected
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
        <ContactBulkActions
          selectedCount={selectedCount}
          selectedContactIds={selectedContactIds}
          selectedRows={selectedRows}
          onSuccess={onSuccess}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs">
        <span className="font-medium text-muted-foreground">Selection summary</span>
        <span>
          Customers <strong className="tabular-nums text-foreground">{customerCount}</strong>
        </span>
        {avgCourier > 0 ? (
          <span>
            Avg courier{' '}
            <strong className="tabular-nums text-foreground">{avgCourier.toFixed(1)}%</strong>
          </span>
        ) : null}
      </div>
    </div>
  );
}
