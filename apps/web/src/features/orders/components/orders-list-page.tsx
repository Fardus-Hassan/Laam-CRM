'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { CrmListToolbar } from '@/features/crm/components/crm-list-toolbar';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OrdersBulkActionsBar } from '@/features/orders/components/orders-bulk-actions-bar';
import { OrdersSalesSummary } from '@/features/orders/components/orders-sales-summary';
import { OrdersTable } from '@/features/orders/components/orders-table';
import {
  getOrderPageCopy,
  ORDER_STATUS_FILTERS,
  parseOrderStatusFilter,
} from '@/features/orders/config/order-status';
import { useOrdersList } from '@/features/orders/hooks/use-orders-list';
import { formatCurrency } from '@/lib/format';

type OrdersListPageProps = {
  status?: string;
};

export function OrdersListPage({ status }: OrdersListPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusFilter = parseOrderStatusFilter(status);
  const pageCopy = getOrderPageCopy(statusFilter);

  const [search, setSearch] = React.useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search, 300);

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }

    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [debouncedSearch, pathname, router, searchParams]);

  const { data, isLoading, error } = useOrdersList({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: debouncedSearch || undefined,
    page: 1,
    pageSize: 50,
  });

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
      id: 'avg',
      label: 'Average order',
      value:
        data && data.summary.count
          ? formatCurrency(Math.round(data.summary.totalAmount / data.summary.count))
          : '—',
    },
    {
      id: 'page',
      label: 'Showing',
      value: data ? `${data.items.length} of ${data.total}` : '—',
      hint: 'Prototype pagination',
    },
  ];

  const showCourierSubmit = statusFilter === 'confirmed' || statusFilter === 'confirmed_2';

  return (
    <PageShell title={pageCopy.title} description={pageCopy.description}>
      <div className="space-y-4">
        <CrmPageActions moduleId="orders" />

        <CrmSummaryStrip items={summaryItems} />

        <CrmListToolbar
          tabs={ORDER_STATUS_FILTERS}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search order, customer, phone, area…"
        />

        <OrdersBulkActionsBar showCourierSubmit={showCourierSubmit} />

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">{pageCopy.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="custom-scrollbar overflow-x-auto px-3 py-3 sm:px-4">
              {isLoading ? (
                <OrdersTableSkeleton />
              ) : error ? (
                <p className="py-8 text-center text-sm text-destructive">{error}</p>
              ) : (
                <OrdersTable rows={data?.items ?? []} />
              )}
            </div>
          </CardContent>
        </Card>

        <OrdersSalesSummary
          orderCount={data?.summary.count ?? 0}
          totalAmount={data?.summary.totalAmount ?? 0}
        />
      </div>
    </PageShell>
  );
}

function OrdersTableSkeleton() {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
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
