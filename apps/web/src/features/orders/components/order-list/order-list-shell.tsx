'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { OrderListRow } from '@laam/types';

import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent } from '@/components/ui/card';
import type { OrderQueueContext } from '@/features/orders/config/order-queue-resolver';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { OrderDataTable } from '@/features/orders/components/order-list/order-data-table';
import {
  EMPTY_FILTERS,
  OrderFilterPanel,
  type OrderFilterValues,
} from '@/features/orders/components/order-list/order-filter-panel';
import { OrderGroupByStatus } from '@/features/orders/components/order-list/order-group-by-status';
import { OrderListToolbar } from '@/features/orders/components/order-list/order-list-toolbar';
import { OrderNoteModal } from '@/features/orders/components/order-list/modals/order-note-modal';
import { OrderQueueTabs } from '@/features/orders/components/order-list/order-queue-tabs';
import { OrderSalesSummaryPanel } from '@/features/orders/components/order-list/order-sales-summary-panel';
import { OrderSelectionBar } from '@/features/orders/components/order-list/order-selection-bar';
import { buildMockSalesSummary } from '@/features/orders/data/mock-orders';
import { useOrderMutations } from '@/features/orders/hooks/use-order-mutations';
import { useOrderRowsList } from '@/features/orders/hooks/use-order-rows-list';
import { createOrdersListBreadcrumbs } from '@/features/orders/lib/order-breadcrumbs';
import { formatCurrency } from '@/lib/format';
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
  const [filters, setFilters] = React.useState<OrderFilterValues>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [noteRow, setNoteRow] = React.useState<OrderListRow | null>(null);
  const [listVersion, setListVersion] = React.useState(0);
  const { updateNote } = useOrderMutations();

  const debouncedSearch = useDebouncedValue(search, 300);
  const searchParamsKey = searchParams.toString();

  React.useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    const statusFilter = queue.statusFilter ?? filters.status;
    if (statusFilter) {
      params.set('status', statusFilter);
    } else {
      params.delete('status');
    }
    const next = params.toString();
    if (next !== searchParamsKey) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [debouncedSearch, page, pageSize, pathname, queue.statusFilter, filters.status, router, searchParamsKey]);

  const { data, isLoading, error, refresh } = useOrderRowsList(
    {
      status: queue.statusFilter ?? filters.status,
      search: debouncedSearch || undefined,
      source: filters.source,
      employee: filters.employee,
      district: filters.district,
      paymentStatus: filters.paymentStatus,
      courier: filters.courier,
      product: filters.product,
      dateRange: filters.dateRange,
      page,
      pageSize,
      sortBy: sort?.id,
      sortDir: sort?.desc ? 'desc' : sort ? 'asc' : undefined,
    },
    listVersion,
  );

  const selectedRows = React.useMemo(
    () => (data?.items ?? []).filter((row) => selectedIds.has(row.id)),
    [data?.items, selectedIds],
  );

  const salesSummary = React.useMemo(
    () => buildMockSalesSummary(data?.summary.count ?? 0, data?.summary.totalAmount ?? 0),
    [data?.summary.count, data?.summary.totalAmount],
  );

  const summaryItems = [
    {
      id: 'count',
      label: 'Orders in view',
      value: data ? String(data.summary.count) : '—',
    },
    {
      id: 'amount',
      label: 'Total value',
      value: data ? formatCurrency(data.summary.totalAmount) : '—',
    },
    {
      id: 'selected',
      label: 'Selected',
      value: String(selectedIds.size),
    },
    {
      id: 'page',
      label: 'Page',
      value: data ? `${data.page} of ${Math.max(1, Math.ceil(data.total / data.pageSize))}` : '—',
    },
  ];

  function handleRefresh() {
    setListVersion((v) => v + 1);
    void refresh();
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  function handleClearFilters() {
    setSearch('');
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function handleRemoveFilter(key: keyof OrderFilterValues) {
    setFilters((current) => ({ ...current, [key]: undefined }));
    setPage(1);
  }

  async function handleSaveNote(note: string) {
    if (!noteRow) return;
    await updateNote(noteRow.id, note);
    handleRefresh();
  }

  return (
    <PageShell
      title={queue.title}
      description={queue.description}
      breadcrumbs={createOrdersListBreadcrumbs(queue.title)}
    >
      <div className={cn(ORDER_PAGE_GAP)}>
        <CrmPageActions moduleId="orders" />

        <CrmSummaryStrip items={summaryItems} />

        {queue.showGroupByStatus ? <OrderGroupByStatus /> : null}

        {queue.childStatusSlugs?.length ? (
          <OrderQueueTabs childStatusSlugs={queue.childStatusSlugs} parentHref={queue.href} />
        ) : null}

        {queue.showFilterPanel ? (
          <OrderListToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            filters={filters}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((open) => !open)}
            onClearFilters={handleClearFilters}
            onRemoveFilter={handleRemoveFilter}
            hideStatusFilter={Boolean(queue.statusFilter)}
          />
        ) : null}

        {queue.showFilterPanel && filtersOpen ? (
          <OrderFilterPanel
            values={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
            onClear={handleClearFilters}
            hideStatus={Boolean(queue.statusFilter)}
          />
        ) : null}

        <OrderSelectionBar
          selectedCount={selectedIds.size}
          selectedOrderIds={[...selectedIds]}
          selectedRows={selectedRows}
          actionIds={queue.bulkActions}
          onClearSelection={() => setSelectedIds(new Set())}
          onSuccess={() => {
            setSelectedIds(new Set());
            handleRefresh();
          }}
        />

        <Card className={cn(ORDER_CARD_CLASS, 'overflow-hidden')}>
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
                onNoteClick={setNoteRow}
              />
            )}
          </CardContent>
        </Card>

        {queue.showSalesSummary && data && data.summary.count > 0 ? (
          <OrderSalesSummaryPanel summary={salesSummary} />
        ) : null}
      </div>

      <OrderNoteModal
        open={Boolean(noteRow)}
        onOpenChange={(open) => !open && setNoteRow(null)}
        orderNumber={noteRow?.orderNumber ?? ''}
        initialNote=""
        onSave={handleSaveNote}
      />
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
