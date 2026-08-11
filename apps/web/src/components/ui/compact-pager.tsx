'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Shared pager for dense lists (customer detail, etc.). Not used by order create. */
export function CompactPager({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2',
        className,
      )}
    >
      <p className="text-xs tabular-nums text-muted-foreground">
        {from}–{to} of {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-muted-foreground">
          {page}/{totalPages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
