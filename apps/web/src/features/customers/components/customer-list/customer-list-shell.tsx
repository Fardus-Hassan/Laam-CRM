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
import { CustomerListToolbar } from '@/features/customers/components/customer-list/customer-list-toolbar';
import { CustomerNoteModal } from '@/features/customers/components/customer-list/modals/customer-note-modal';
import { CustomerSegmentChips } from '@/features/customers/components/customer-list/customer-segment-chips';
import { CustomerSelectionBar } from '@/features/customers/components/customer-list/customer-selection-bar';
import { CustomerWorkspaceHeader } from '@/features/customers/components/customer-list/customer-workspace-header';
import { CustomerStatusDialog } from '@/features/customers/components/shared/customer-status-dialog';
import { useCustomerMutations } from '@/features/customers/hooks/use-customer-mutations';
import { useCustomersList } from '@/features/customers/hooks/use-customers-list';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

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
  const [noteInitial, setNoteInitial] = React.useState('');
  const [statusTarget, setStatusTarget] = React.useState<CustomerListItem | null>(null);

  const segment = searchParams.get('segment') ?? 'all';
  const debouncedSearch = useDebouncedValue(search, 300);
  const searchParamsKey = searchParams.toString();

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
      search: debouncedSearch || undefined,
      page,
      pageSize,
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
    setPage(1);
    router.replace('/dashboard/companies');
  }

  async function handleNoteClick(row: CustomerListItem) {
    const detail = await customersApi.getCustomer(row.id);
    setNoteInitial(detail?.notes ?? '');
    setNoteTarget(row);
  }

  async function handleNoteSave(note: string) {
    if (!noteTarget) return;
    await updateCustomer(noteTarget.id, { notes: note });
    handleRefresh();
  }

  async function handleStatusSave(status: CustomerStatus) {
    if (!statusTarget) return;
    await updateCustomer(statusTarget.id, { status });
    handleRefresh();
  }

  function handleFollowUpClick(row: CustomerListItem) {
    void import('@/features/followups/data/mock-followups').then(({ createMockFollowupForCustomer }) => {
      createMockFollowupForCustomer({
        customerId: row.id,
        customerNumber: row.customerNumber,
        name: row.name,
        phone: row.phone,
        address: row.address,
        district: row.district,
        agentName: row.assignedAgentName,
        note: 'Follow-up from customers list',
      });
      toast.success(`Follow-up created for ${row.name}`);
      handleRefresh();
    });
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
          <CustomerSegmentChips segments={data.segments} activeSegmentId={segment} />
        ) : null}

        <CustomerListToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />

        <Card className={cn(ORDER_CARD_CLASS, 'overflow-hidden')}>
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
                onNoteClick={(row) => void handleNoteClick(row)}
                onStatusClick={setStatusTarget}
                onFollowUpClick={handleFollowUpClick}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <CustomerNoteModal
        open={noteTarget !== null}
        onOpenChange={(open) => !open && setNoteTarget(null)}
        customerName={noteTarget?.name ?? ''}
        initialNote={noteInitial}
        onSave={handleNoteSave}
      />

      <CustomerStatusDialog
        open={statusTarget !== null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        customerName={statusTarget?.name ?? ''}
        currentStatus={statusTarget?.status ?? 'none'}
        onSelect={handleStatusSave}
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
