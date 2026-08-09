'use client';

import type { ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormSelect } from '@/components/form/form-select';
import { CRM_PAGE_SIZE_OPTIONS } from '@/components/data-table/page-size-options';
import { cn } from '@/lib/utils';

type CrmDataTablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** When false, hides “Showing X–Y of Z” (use top meta bar instead). Default true. */
  showRangeSummary?: boolean;
  className?: string;
};

type PageToken = number | 'ellipsis';

function buildPageTokens(current: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const tokens: PageToken[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(totalPages - 1, current + 1);

  if (left > 2) tokens.push('ellipsis');
  for (let p = left; p <= right; p += 1) tokens.push(p);
  if (right < totalPages - 1) tokens.push('ellipsis');
  tokens.push(totalPages);

  return tokens;
}

export function CrmDataTablePagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [...CRM_PAGE_SIZE_OPTIONS],
  onPageChange,
  onPageSizeChange,
  showRangeSummary = true,
  className,
}: CrmDataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const tokens = buildPageTokens(safePage, totalPages);

  function goTo(next: number) {
    const clamped = Math.min(Math.max(1, next), totalPages);
    if (clamped !== page) onPageChange?.(clamped);
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border/70 bg-muted/10 px-3 py-2.5',
        'sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {showRangeSummary ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium tabular-nums text-foreground">{from.toLocaleString()}</span>
            {'–'}
            <span className="font-medium tabular-nums text-foreground">{to.toLocaleString()}</span>
            <span className="mx-1 text-border">|</span>
            <span className="font-medium tabular-nums text-foreground">
              {total.toLocaleString()}
            </span>
            <span className="ml-1">total</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Page{' '}
            <span className="font-medium tabular-nums text-foreground">{safePage}</span>
            {' / '}
            <span className="font-medium tabular-nums text-foreground">{totalPages}</span>
          </p>
        )}

        {onPageSizeChange ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Rows</span>
            <FormSelect
              value={String(pageSize)}
              onChange={(value) => onPageSizeChange(Number(value))}
              options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
              searchable={false}
              className="h-8 w-[4.5rem]"
              aria-label="Rows per page"
            />
          </div>
        ) : null}
      </div>

      <nav
        className="flex flex-wrap items-center justify-end gap-0.5"
        aria-label="Pagination"
      >
        <PagerIconButton
          label="First page"
          disabled={safePage <= 1}
          onClick={() => goTo(1)}
          className="hidden sm:inline-flex"
        >
          <ChevronsLeft className="size-4" />
        </PagerIconButton>
        <PagerIconButton
          label="Previous page"
          disabled={safePage <= 1}
          onClick={() => goTo(safePage - 1)}
        >
          <ChevronLeft className="size-4" />
        </PagerIconButton>

        <div className="mx-0.5 flex items-center gap-0.5">
          {tokens.map((token, index) =>
            token === 'ellipsis' ? (
              <span
                key={`e-${index}`}
                className="flex h-8 w-7 items-center justify-center text-xs text-muted-foreground"
                aria-hidden
              >
                …
              </span>
            ) : (
              <Button
                key={token}
                type="button"
                size="sm"
                variant={token === safePage ? 'default' : 'ghost'}
                className={cn(
                  'h-8 min-w-8 px-2 tabular-nums',
                  token === safePage && 'pointer-events-none shadow-sm',
                )}
                aria-label={`Page ${token}`}
                aria-current={token === safePage ? 'page' : undefined}
                onClick={() => goTo(token)}
              >
                {token}
              </Button>
            ),
          )}
        </div>

        <PagerIconButton
          label="Next page"
          disabled={safePage >= totalPages}
          onClick={() => goTo(safePage + 1)}
        >
          <ChevronRight className="size-4" />
        </PagerIconButton>
        <PagerIconButton
          label="Last page"
          disabled={safePage >= totalPages}
          onClick={() => goTo(totalPages)}
          className="hidden sm:inline-flex"
        >
          <ChevronsRight className="size-4" />
        </PagerIconButton>
      </nav>
    </div>
  );
}

function PagerIconButton({
  label,
  disabled,
  onClick,
  className,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className={cn('size-8', className)}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </Button>
  );
}
