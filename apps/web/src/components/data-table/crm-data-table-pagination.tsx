'use client';

import type { ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

import { CrmPageSizeControl } from '@/components/data-table/crm-page-size-control';
import { CRM_PAGE_SIZE_OPTIONS } from '@/components/data-table/page-size-options';
import { Button } from '@/components/ui/button';
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
  /** Sticky to the bottom of the dashboard page scrollport. Default false. */
  sticky?: boolean;
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
  sticky = false,
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
        'flex flex-col gap-3 border-t border-border/70 bg-card/95 px-3 py-2.5 backdrop-blur',
        'supports-[backdrop-filter]:bg-card/90',
        'sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        sticky &&
          // Flush to dashboard scrollport bottom (shell has sm:pb-0 so no gap under bar).
          // Mobile keeps pb-16 on the shell for the quick-action FAB strip.
          'sticky bottom-0 z-30 border-b-0 shadow-[0_-8px_20px_-12px_rgba(0,0,0,0.45)]',
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
          <CrmPageSizeControl
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            options={pageSizeOptions}
            aria-label="Rows per page (footer)"
          />
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
