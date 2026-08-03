'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent } from '@/components/ui/card';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { FailedOrderDataTable } from '@/features/orders/components/failed-orders/failed-order-data-table';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
} from '@/features/orders/components/create-order/section-layout';
import { failedOrdersApi } from '@/features/orders/api/failed-orders-api';
import { FAILED_ORDER_WEBSITES } from '@/features/orders/data/mock-failed-orders';
import { cn } from '@/lib/utils';

export function FailedOrdersListPage() {
  const [search, setSearch] = React.useState('');
  const [failedType, setFailedType] = React.useState('all');
  const [website, setWebsite] = React.useState('all');
  const [noteStatus, setNoteStatus] = React.useState('all');
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<Awaited<
    ReturnType<typeof failedOrdersApi.listFailedOrders>
  > | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await failedOrdersApi.listFailedOrders({
        search: search || undefined,
        failedType:
          failedType === 'all'
            ? undefined
            : (failedType as 'duplicate' | 'blocked' | 'other'),
        website: website === 'all' ? undefined : website,
        noteStatus: noteStatus as 'all' | 'has_note' | 'no_note',
        page,
        pageSize: 10,
      });
      setData(response);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load intake queue');
    } finally {
      setIsLoading(false);
    }
  }, [search, failedType, website, noteStatus, page]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleRetry(row: { id: string }) {
    try {
      const result = await failedOrdersApi.retryFailedOrder(row.id);
      if (!result.success) {
        toast.error(result.message || 'Retry failed');
        return;
      }
      toast.success(result.message);
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Retry failed');
    }
  }

  async function handleDismiss(row: { id: string }) {
    try {
      await failedOrdersApi.dismissFailedOrder(row.id);
      toast.success('Failed order dismissed');
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Dismiss failed');
    }
  }

  const hasActiveFilters =
    search !== '' || failedType !== 'all' || website !== 'all' || noteStatus !== 'all';

  const websiteOptions = data?.websites?.length ? data.websites : FAILED_ORDER_WEBSITES;

  const chips = [
    ...(failedType !== 'all'
      ? [
          {
            id: 'failedType',
            label:
              failedType === 'duplicate'
                ? 'Type: Duplicate'
                : failedType === 'blocked'
                  ? 'Type: Blocked'
                  : 'Type: Other',
          },
        ]
      : []),
    ...(noteStatus !== 'all'
      ? [
          {
            id: 'noteStatus',
            label: noteStatus === 'has_note' ? 'Has note' : 'No note',
          },
        ]
      : []),
    ...(website !== 'all' ? [{ id: 'website', label: `Website: ${website}` }] : []),
    ...(search.trim() ? [{ id: 'search', label: `Search: ${search.trim()}` }] : []),
  ];

  function clearAll() {
    setSearch('');
    setFailedType('all');
    setWebsite('all');
    setNoteStatus('all');
    setPage(1);
  }

  return (
    <PageShell
      title="Failed Orders"
      description="Duplicate, blocked, or invalid orders for manual review. Auto-hidden after 90 days."
    >
      <div className={ORDER_PAGE_GAP}>
        {data ? (
          <CrmSummaryStrip
            items={[
              {
                id: 'total',
                label: 'Failed (30 days)',
                value: data.report.totalTracked.toLocaleString(),
                hint: 'Tracked in report window',
              },
              {
                id: 'confirmed',
                label: 'Recovered',
                value: data.report.confirmed.toLocaleString(),
              },
              {
                id: 'rate',
                label: 'Failed → confirmed',
                value: `${data.report.failedToConfirmedPercent}%`,
              },
              {
                id: 'queue',
                label: 'In queue',
                value: data.total.toLocaleString(),
                hint: 'Auto-hidden after 90 days',
              },
            ]}
          />
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <FormField label="Type" className="min-w-[140px] flex-1">
            <FormSelect
              value={failedType}
              onChange={(v) => {
                setFailedType(v);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All' },
                { value: 'duplicate', label: 'Duplicate' },
                { value: 'blocked', label: 'Blocked' },
                { value: 'other', label: 'Other' },
              ]}
              searchable={false}
            />
          </FormField>
          <FormField label="Note status" className="min-w-[140px] flex-1">
            <FormSelect
              value={noteStatus}
              onChange={(v) => {
                setNoteStatus(v);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All' },
                { value: 'has_note', label: 'Has note' },
                { value: 'no_note', label: 'No note' },
              ]}
              searchable={false}
            />
          </FormField>
          <FormField label="Website" className="min-w-[140px] flex-1">
            <FormSelect
              value={website}
              onChange={(v) => {
                setWebsite(v);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All' },
                ...websiteOptions.map((site) => ({ value: site, label: site })),
              ]}
              searchable={false}
            />
          </FormField>
          <FormField label="Search" className="min-w-[200px] flex-[2]">
            <FormInput
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Customer, phone, address…"
            />
          </FormField>
        </div>

        {hasActiveFilters ? (
          <ActiveFilterChips
            chips={chips}
            onRemove={(id) => {
              if (id === 'failedType') setFailedType('all');
              if (id === 'noteStatus') setNoteStatus('all');
              if (id === 'website') setWebsite('all');
              if (id === 'search') setSearch('');
              setPage(1);
            }}
            onClearAll={clearAll}
          />
        ) : null}

        <Card className={cn(ORDER_CARD_CLASS, 'overflow-hidden')}>
          <CardContent className="p-0">
            <FailedOrderDataTable
              rows={data?.items ?? []}
              isLoading={isLoading}
              page={page}
              pageSize={10}
              total={data?.total}
              onPageChange={setPage}
              onRetry={handleRetry}
              onDismiss={handleDismiss}
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
