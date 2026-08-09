'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CustomerListItem, CustomerStatus } from '@laam/types';
import { toast } from 'sonner';

import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { EmptyState } from '@/components/layout/empty-state';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { customersApi } from '@/features/customers/api/customers-api';
import { CustomerDataTable } from '@/features/customers/components/customer-list/customer-data-table';
import {
  emptyCustomerFilters,
  filtersToQuery,
  PURCHASE_COUNT_PILLS,
  removeCustomerFilter,
  type CustomerFilterValues,
} from '@/features/customers/components/customer-list/customer-filter-panel';
import { CustomerListToolbar } from '@/features/customers/components/customer-list/customer-list-toolbar';
import { CustomerNoteModal } from '@/features/customers/components/customer-list/modals/customer-note-modal';
import { CustomerSegmentChips } from '@/features/customers/components/customer-list/customer-segment-chips';
import { CustomerSelectionBar } from '@/features/customers/components/customer-list/customer-selection-bar';
import { CustomerWorkspaceHeader } from '@/features/customers/components/customer-list/customer-workspace-header';
import { useCustomerMutations } from '@/features/customers/hooks/use-customer-mutations';
import { useCustomersList } from '@/features/customers/hooks/use-customers-list';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CRM_PAGE_SIZE_OPTIONS } from '@/components/data-table/page-size-options';
import { Settings2 } from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE_OPTIONS = [...CRM_PAGE_SIZE_OPTIONS];

export function CustomerListShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { updateCustomer } = useCustomerMutations();

  const [search, setSearch] = React.useState(searchParams.get('search') ?? '');
  const [page, setPage] = React.useState(Number(searchParams.get('page') ?? 1));
  const [pageSize, setPageSize] = React.useState(Number(searchParams.get('pageSize') ?? 10));
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [listVersion, setListVersion] = React.useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<Date | null>(null);
  const [noteTarget, setNoteTarget] = React.useState<CustomerListItem | null>(null);
  const [filters, setFilters] = React.useState<CustomerFilterValues>(() => emptyCustomerFilters());

  const segment = searchParams.get('segment') ?? 'all';
  const statusFilter = searchParams.get('status') ?? '';
  const debouncedSearch = useDebouncedValue(search, 300);
  const searchParamsKey = searchParams.toString();
  const filterQuery = filtersToQuery(filters);

  React.useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    if (debouncedSearch) params.set('search', debouncedSearch);
    else params.delete('search');
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (segment && segment !== 'all') params.set('segment', segment);
    else params.delete('segment');
    const next = params.toString();
    if (next !== searchParamsKey) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [debouncedSearch, page, pageSize, pathname, router, searchParamsKey, segment]);

  const { data, isLoading, error, refresh } = useCustomersList(
    {
      segment: segment === 'all' ? undefined : segment,
      status: statusFilter || undefined,
      search: debouncedSearch || undefined,
      page,
      pageSize,
      ...filterQuery,
    },
    listVersion,
  );

  React.useEffect(() => {
    if (data && !isLoading) setLastRefreshedAt(new Date());
  }, [data, isLoading]);

  const selectedRows = React.useMemo(
    () => (data?.items ?? []).filter((row) => selectedIds.has(row.id)),
    [data?.items, selectedIds],
  );

  const summaryItems = [
    { id: 'count', label: 'In this view', value: data ? String(data.summary.count) : '—' },
    {
      id: 'spent',
      label: 'Total spent',
      value: data ? formatCurrency(data.summary.totalSpent) : '—',
    },
    {
      id: 'courier',
      label: 'Avg courier',
      value: data ? `${data.summary.avgCourierRate.toFixed(1)}%` : '—',
    },
    {
      id: 'selected',
      label: 'Selected',
      value: String(selectedIds.size),
    },
  ];

  function handleRefresh() {
    setListVersion((v) => v + 1);
    void refresh();
  }

  function handleClearFilters() {
    setSearch('');
    setFilters(emptyCustomerFilters());
    setPage(1);
  }

  function handleRemoveFilter(key: keyof CustomerFilterValues) {
    setFilters((current) => removeCustomerFilter(current, key));
    setPage(1);
  }

  async function handleExportView() {
    try {
      await customersApi.exportCustomers({
        segment: segment === 'all' ? undefined : segment,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        page: 1,
        pageSize: 5000,
        ...filterQuery,
      });
      toast.success('Export started');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    }
  }

  async function handleNoteSave(note: string) {
    if (!noteTarget) return;
    await updateCustomer(noteTarget.id, { notes: note });
    handleRefresh();
  }

  async function handleStatusChange(row: CustomerListItem, status: CustomerStatus) {
    await updateCustomer(row.id, { status });
    handleRefresh();
  }

  function handleFollowUpClick(row: CustomerListItem) {
    void (async () => {
      try {
        const { followupsApi } = await import('@/features/followups/api/followups-api');
        await followupsApi.createFollowup({
          customerId: row.id,
          note: 'Follow-up from customers list',
          assignedAgentName: row.assignedAgentName,
        });
        toast.success(`Follow-up created for ${row.name}`);
        handleRefresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create follow-up');
      }
    })();
  }

  return (
    <PageShell
      title="Customers"
      description="Everyday modhu & khejur buyers — mobile-first list with orders and courier score."
    >
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <CustomerWorkspaceHeader
          lastRefreshedAt={lastRefreshedAt}
          isRefreshing={isLoading}
          onRefresh={handleRefresh}
        />

        <CrmPageActions moduleId="companies" />

        <CrmSummaryStrip items={summaryItems} className="sm:grid-cols-2 xl:grid-cols-4" />

        {data?.segments ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">System segments</p>
            <CustomerSegmentChips segments={data.segments} activeId={segment} mode="segment" />
          </div>
        ) : null}

        {data?.statuses?.length ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Statuses</p>
              <Button type="button" size="sm" variant="ghost" className="h-7 px-2" asChild>
                <Link href="/dashboard/settings/customer-statuses">
                  <Settings2 className="size-3.5" />
                  Manage
                </Link>
              </Button>
            </div>
            <CustomerSegmentChips
              segments={data.statuses}
              activeId={statusFilter || '__none__'}
              mode="status"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Purchase count</p>
          <div className="flex flex-wrap gap-1.5">
            {PURCHASE_COUNT_PILLS.map((count) => {
              const active =
                filters.orderCount === String(count) && filters.orderCountOp === 'eq';
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    setFilters((current) => {
                      if (current.orderCount === String(count) && current.orderCountOp === 'eq') {
                        return {
                          ...current,
                          orderCount: undefined,
                          orderCountOp: 'gte',
                        };
                      }
                      return {
                        ...current,
                        orderCount: String(count),
                        orderCountOp: 'eq',
                      };
                    });
                    setPage(1);
                  }}
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {count}× Purchase
                </button>
              );
            })}
          </div>
        </div>

        <CustomerListToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          filters={filters}
          onClearFilters={handleClearFilters}
          onRemoveFilter={handleRemoveFilter}
          onFiltersChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
          onExport={() => void handleExportView()}
        />

        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
          <CustomerSelectionBar
            selectedCount={selectedIds.size}
            selectedCustomerIds={[...selectedIds]}
            selectedRows={selectedRows}
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
                  title="No customers in this segment"
                  description="Try another segment chip or clear your search."
                />
                <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>
                  Reset filters
                </Button>
              </div>
            ) : (
              <CustomerDataTable
                rows={data?.items ?? []}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                isLoading={isLoading}
                page={page}
                pageSize={pageSize}
                total={data?.total}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                showPagination={Boolean(data)}
                onNoteClick={setNoteTarget}
                statusOptions={data?.statuses ?? []}
                onStatusChange={handleStatusChange}
                onFollowUpClick={handleFollowUpClick}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <CustomerNoteModal
        open={Boolean(noteTarget)}
        onOpenChange={(open) => !open && setNoteTarget(null)}
        customerId={noteTarget?.id ?? ''}
        customerName={noteTarget?.name ?? ''}
        customerNumber={noteTarget?.customerNumber}
        onSave={handleNoteSave}
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
