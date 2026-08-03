'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { OrderListRow } from '@laam/types';

import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { EmptyState } from '@/components/layout/empty-state';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { OrderQueueContext } from '@/features/orders/config/order-queue-resolver';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { OrderDataTable } from '@/features/orders/components/order-list/order-data-table';
import {
  EMPTY_FILTERS,
  type OrderFilterValues,
} from '@/features/orders/components/order-list/order-filter-panel';
import { OrderGroupByStatus } from '@/features/orders/components/order-list/order-group-by-status';
import { OrderListToolbar } from '@/features/orders/components/order-list/order-list-toolbar';
import { OrderNoteModal } from '@/features/orders/components/order-list/modals/order-note-modal';
import { OrderQueueTabs } from '@/features/orders/components/order-list/order-queue-tabs';
import { OrderSalesSummaryPanel } from '@/features/orders/components/order-list/order-sales-summary-panel';
import { OrderSelectionBar } from '@/features/orders/components/order-list/order-selection-bar';
import { OrderWorkspaceHeader } from '@/features/orders/components/order-list/order-workspace-header';
import { buildMockSalesSummary } from '@/features/orders/data/mock-orders';
import { env } from '@/config/env';
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
  const [noteRow, setNoteRow] = React.useState<OrderListRow | null>(null);
  const [listVersion, setListVersion] = React.useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<Date | null>(null);
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
    // All Orders: keep status as an in-page filter only — never put it in the URL,
    // or the queue resolver treats it as a dedicated status page.
    if (queue.kind === 'all') {
      params.delete('status');
    } else {
      const statusFilter = queue.statusFilter ?? filters.status;
      if (statusFilter) {
        params.set('status', statusFilter);
      } else {
        params.delete('status');
      }
    }
    const next = params.toString();
    if (next !== searchParamsKey) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [
    debouncedSearch,
    page,
    pageSize,
    pathname,
    queue.kind,
    queue.statusFilter,
    filters.status,
    router,
    searchParamsKey,
  ]);

  const { data, isLoading, error, refresh } = useOrderRowsList(
    {
      status: queue.statusFilter ?? filters.status,
      search: debouncedSearch || undefined,
      source: filters.source,
      employee: filters.employee,
      district: filters.district,
      excludeDistrict: filters.excludeDistrict,
      excludeStatus: filters.excludeStatus,
      excludeSource: filters.excludeSource,
      excludeCourier: filters.excludeCourier,
      paymentStatus: filters.paymentStatus,
      courier: filters.courier,
      courierStatusSlug: filters.courierStatusSlug,
      product: filters.product,
      productId: filters.productId,
      amountMin: filters.amountMin,
      amountMax: filters.amountMax,
      pathaoCity: filters.pathaoCity,
      pathaoZone: filters.pathaoZone,
      noteStatus: filters.noteStatus,
      dateRange: filters.dateRange,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      courierDateRange: filters.courierDateRange,
      courierDateFrom: filters.courierDateFrom,
      courierDateTo: filters.courierDateTo,
      followUpDue: queue.followUpDue,
      page,
      pageSize,
      sortBy: sort?.id,
      sortDir: sort?.desc ? 'desc' : sort ? 'asc' : undefined,
    },
    listVersion,
  );

  React.useEffect(() => {
    if (data && !isLoading) {
      setLastRefreshedAt(new Date());
    }
  }, [data, isLoading]);

  const selectedRows = React.useMemo(
    () => (data?.items ?? []).filter((row) => selectedIds.has(row.id)),
    [data?.items, selectedIds],
  );

  const salesSummary = React.useMemo(() => {
    // Live API mode: never fabricate P&L — hide until real ledger exists
    if (env.useApi) return null;
    return buildMockSalesSummary(data?.summary.count ?? 0, data?.summary.totalAmount ?? 0);
  }, [data?.summary.count, data?.summary.totalAmount]);

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
    setFilters((current) => {
      const next = { ...current, [key]: undefined };
      if (key === 'status') next.excludeStatus = undefined;
      if (key === 'source') next.excludeSource = undefined;
      if (key === 'courier') next.excludeCourier = undefined;
      if (key === 'district') next.excludeDistrict = undefined;
      if (key === 'dateRange') {
        next.dateFrom = undefined;
        next.dateTo = undefined;
      }
      if (key === 'courierDateRange') {
        next.courierDateFrom = undefined;
        next.courierDateTo = undefined;
      }
      return next;
    });
    setPage(1);
  }

  async function handleSaveNote(note: string) {
    if (!noteRow) return;
    await updateNote(noteRow.id, note);
    handleRefresh();
  }

  return (
    <PageShell
      title="Orders"
      description="Manage orders, queues, and fulfillment workflows."
      breadcrumbs={createOrdersListBreadcrumbs(queue.title)}
    >
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <OrderWorkspaceHeader
          queueSlug={queue.queueSlug}
          title={queue.title}
          description={queue.description}
          lastRefreshedAt={lastRefreshedAt}
          isRefreshing={isLoading}
          onRefresh={handleRefresh}
        />

        <CrmPageActions moduleId="orders" />

        <CrmSummaryStrip items={summaryItems} />

        {queue.showGroupByStatus ? (
          <OrderGroupByStatus
            activeStatus={filters.status}
            onStatusSelect={(slug) => {
              setFilters((current) => ({
                ...current,
                status: current.status === slug ? undefined : slug,
                excludeStatus: undefined,
              }));
              setPage(1);
            }}
          />
        ) : null}

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
            onFiltersChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
            onClearFilters={handleClearFilters}
            onRemoveFilter={handleRemoveFilter}
            hideStatusFilter={Boolean(queue.statusFilter)}
            onApplySavedView={(nextFilters, savedSearch) => {
              setFilters(nextFilters);
              if (savedSearch !== undefined) {
                setSearch(savedSearch);
              }
              setPage(1);
            }}
          />
        ) : null}

        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
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
          <CardContent className={cn('p-0', ORDER_SECTION_BODY_CLASS)}>
            {error ? (
              <p className="px-4 py-8 text-center text-sm text-destructive">{error}</p>
            ) : !isLoading && data && data.items.length === 0 ? (
              <div className="flex flex-col items-center gap-4 px-4 py-8">
                <EmptyState
                  title="No orders match this view"
                  description="Try adjusting filters or search, or switch to another queue."
                />
                {queue.showFilterPanel ? (
                  <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                ) : null}
              </div>
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

        {queue.showSalesSummary && salesSummary && data && data.summary.count > 0 ? (
          <OrderSalesSummaryPanel summary={salesSummary} />
        ) : null}
      </div>

      <OrderNoteModal
        open={Boolean(noteRow)}
        onOpenChange={(open) => !open && setNoteRow(null)}
        orderId={noteRow?.id ?? ''}
        orderNumber={noteRow?.orderNumber ?? ''}
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
