'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent } from '@/components/ui/card';
import type { OrderQueueContext } from '@/features/orders/config/order-queue-resolver';
import {
  ORDER_SECTION_BODY_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { OrderBulkActions } from '@/features/orders/components/order-list/order-bulk-actions';
import { OrderDataTable } from '@/features/orders/components/order-list/order-data-table';
import { OrderFilterPanel } from '@/features/orders/components/order-list/order-filter-panel';
import { OrderGroupByStatus } from '@/features/orders/components/order-list/order-group-by-status';
import { OrderQueueTabs } from '@/features/orders/components/order-list/order-queue-tabs';
import { OrderSalesSummaryPanel } from '@/features/orders/components/order-list/order-sales-summary-panel';
import { OrderSelectionSummary } from '@/features/orders/components/order-list/order-selection-summary';
import { buildMockSalesSummary } from '@/features/orders/data/mock-orders';
import { useOrderRowsList } from '@/features/orders/hooks/use-order-rows-list';
import { cn } from '@/lib/utils';

type OrderListShellProps = {
  queue: OrderQueueContext;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function OrderListShell({ queue }: OrderListShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(searchParams.get('search') ?? '');
  const [page, setPage] = React.useState(Number(searchParams.get('page') ?? 1));
  const [pageSize, setPageSize] = React.useState(Number(searchParams.get('pageSize') ?? 10));
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [sort, setSort] = React.useState<{ id: string; desc: boolean } | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (queue.statusFilter) {
      params.set('status', queue.statusFilter);
    }
    const next = params.toString();
    if (next !== searchParams.toString()) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [debouncedSearch, page, pageSize, pathname, queue.statusFilter, router, searchParams]);

  const { data, isLoading, error } = useOrderRowsList({
    status: queue.statusFilter,
    search: debouncedSearch || undefined,
    page,
    pageSize,
    sortBy: sort?.id,
    sortDir: sort?.desc ? 'desc' : sort ? 'asc' : undefined,
  });

  const selectedRows = React.useMemo(
    () => (data?.items ?? []).filter((row) => selectedIds.has(row.id)),
    [data?.items, selectedIds],
  );

  const salesSummary = React.useMemo(
    () =>
      buildMockSalesSummary(data?.summary.count ?? 0, data?.summary.totalAmount ?? 0),
    [data?.summary.count, data?.summary.totalAmount],
  );

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  return (
    <PageShell title={queue.title} description={queue.description}>
      <div className="space-y-4">
        <CrmPageActions moduleId="orders" />

        {queue.showFilterPanel ? <OrderFilterPanel onClear={() => setSearch('')} /> : null}

        {queue.showGroupByStatus ? <OrderGroupByStatus /> : null}

        {queue.childStatusSlugs?.length ? (
          <OrderQueueTabs
            childStatusSlugs={queue.childStatusSlugs}
            parentHref={queue.href}
          />
        ) : null}

        <Card className="gap-0 overflow-hidden py-0 shadow-none">
          <CardContent className={cn('p-0', ORDER_SECTION_BODY_CLASS)}>
            {error ? (
              <p className="px-4 py-8 text-center text-sm text-destructive">{error}</p>
            ) : (
              <OrderDataTable
                rows={data?.items ?? []}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                isLoading={isLoading}
                page={page}
                pageSize={pageSize}
                total={data?.total}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
                showPagination={Boolean(data)}
                sort={sort}
                onSortChange={setSort}
                search={search}
                onSearchChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
              />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <OrderBulkActions
            actionIds={queue.bulkActions}
            selectedCount={selectedIds.size}
          />
          <OrderSelectionSummary rows={selectedRows} />
        </div>

        {queue.showSalesSummary && data && data.summary.count > 0 ? (
          <OrderSalesSummaryPanel summary={salesSummary} />
        ) : null}
      </div>
    </PageShell>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
