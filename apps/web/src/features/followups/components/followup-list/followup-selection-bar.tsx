'use client';

import * as React from 'react';
import type { FollowupListItem } from '@laam/types';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FollowupBulkActions } from '@/features/followups/components/followup-list/followup-bulk-actions';
import { cn } from '@/lib/utils';

type FollowupSelectionBarProps = {
  selectedCount: number;
  selectedFollowupIds: string[];
  selectedRows: FollowupListItem[];
  onClearSelection: () => void;
  onSuccess?: () => void;
  className?: string;
};

export function FollowupSelectionBar({
  selectedCount,
  selectedFollowupIds,
  selectedRows,
  onClearSelection,
  onSuccess,
  className,
}: FollowupSelectionBarProps) {
  if (selectedCount === 0) return null;

  const todayDue = selectedRows.filter(
    (r) => r.scheduleDate && !r.skipped,
  ).length;

  return (
    <div className={cn('border-b border-border/70 bg-muted/25 px-4 py-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">
          {selectedCount} follow-up{selectedCount === 1 ? '' : 's'} selected
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
        <FollowupBulkActions
          selectedCount={selectedCount}
          selectedFollowupIds={selectedFollowupIds}
          selectedRows={selectedRows}
          onSuccess={onSuccess}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs">
        <span className="font-medium text-muted-foreground">Selection summary</span>
        <span>
          Scheduled <strong className="tabular-nums text-foreground">{todayDue}</strong>
        </span>
      </div>
    </div>
  );
}
