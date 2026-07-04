'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormSelect } from '@/components/form/form-select';
import { cn } from '@/lib/utils';

type CrmDataTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
};

export function CrmDataTablePagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
  className,
}: CrmDataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        Showing {from} to {to} of {total.toLocaleString()} entries
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Show</span>
            <FormSelect
              value={String(pageSize)}
              onChange={(value) => onPageSizeChange(Number(value))}
              options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
              searchable={false}
              className="h-8 w-20"
            />
          </div>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled>
          {page}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange?.(page + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
