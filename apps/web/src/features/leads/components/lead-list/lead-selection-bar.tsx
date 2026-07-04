'use client';

import * as React from 'react';
import type { LeadListItem } from '@laam/types';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LeadBulkActions } from '@/features/leads/components/lead-list/lead-bulk-actions';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type LeadSelectionBarProps = {
  selectedCount: number;
  selectedLeadIds: string[];
  selectedRows: LeadListItem[];
  onClearSelection: () => void;
  onSuccess?: () => void;
  className?: string;
};

export function LeadSelectionBar({
  selectedCount,
  selectedLeadIds,
  selectedRows,
  onClearSelection,
  onSuccess,
  className,
}: LeadSelectionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  const totalValue = selectedRows.reduce((sum, row) => sum + (row.estimatedValue ?? 0), 0);

  return (
    <div className={cn('border-b border-border/70 bg-muted/25 px-4 py-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">
          {selectedCount} lead{selectedCount === 1 ? '' : 's'} selected
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
        <LeadBulkActions
          selectedCount={selectedCount}
          selectedLeadIds={selectedLeadIds}
          selectedRows={selectedRows}
          onSuccess={onSuccess}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs">
        <span className="font-medium text-muted-foreground">Selection summary</span>
        <span>
          Pipeline value{' '}
          <strong className="tabular-nums text-foreground">{formatCurrency(totalValue)}</strong>
        </span>
        <span>
          Unassigned{' '}
          <strong className="tabular-nums text-violet-600">
            {selectedRows.filter((row) => !row.assignedAgentName).length}
          </strong>
        </span>
      </div>
    </div>
  );
}
