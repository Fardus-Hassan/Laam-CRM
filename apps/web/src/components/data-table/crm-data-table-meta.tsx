'use client';

import { X } from 'lucide-react';

import { CrmPageSizeControl } from '@/components/data-table/crm-page-size-control';
import { CRM_PAGE_SIZE_OPTIONS } from '@/components/data-table/page-size-options';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CrmDataTableMetaProps = {
  page: number;
  pageSize: number;
  total: number;
  /** e.g. "orders", "products", "entries" */
  entityLabel?: string;
  selectedCount?: number;
  onClearSelection?: () => void;
  /** Show rows control at the top of the table (synced with footer). */
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
};

function formatCount(n: number) {
  return n.toLocaleString();
}

/**
 * Range + selection summary (+ optional top page-size) above the table body.
 * Stays outside the scrollport so it remains visible with the sticky column header frame.
 */
export function CrmDataTableMeta({
  page,
  pageSize,
  total,
  entityLabel = 'entries',
  selectedCount = 0,
  onClearSelection,
  onPageSizeChange,
  pageSizeOptions = [...CRM_PAGE_SIZE_OPTIONS],
  className,
}: CrmDataTableMetaProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasSelection = selectedCount > 0;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-card px-3 py-2',
        className,
      )}
    >
      <p className="text-xs leading-relaxed text-muted-foreground">
        Showing{' '}
        <span className="font-semibold tabular-nums text-foreground">{formatCount(from)}</span>
        {total > 0 ? (
          <>
            {' – '}
            <span className="font-semibold tabular-nums text-foreground">{formatCount(to)}</span>
          </>
        ) : null}{' '}
        of{' '}
        <span className="font-semibold tabular-nums text-foreground">{formatCount(total)}</span>{' '}
        {entityLabel}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {hasSelection ? (
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border border-primary/30',
              'bg-primary/10 px-2 py-1 text-xs font-medium text-primary',
            )}
          >
            <span className="tabular-nums">{formatCount(selectedCount)} selected</span>
            {onClearSelection ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 gap-0.5 px-1 text-[11px] text-primary hover:bg-primary/15 hover:text-primary"
                onClick={onClearSelection}
              >
                <X className="size-3" />
                Clear
              </Button>
            ) : null}
          </div>
        ) : null}

        {onPageSizeChange ? (
          <CrmPageSizeControl
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            options={pageSizeOptions}
            aria-label="Rows per page (top)"
          />
        ) : null}
      </div>
    </div>
  );
}
