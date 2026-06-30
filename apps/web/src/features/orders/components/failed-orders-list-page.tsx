'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { CollapsibleSection } from '@/components/form/collapsible-section';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FailedOrdersTable } from '@/features/orders/components/failed-orders-table';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import {
  FAILED_ORDER_WEBSITES,
  filterMockFailedOrders,
} from '@/features/orders/data/mock-failed-orders';
import { cn } from '@/lib/utils';

export function FailedOrdersListPage() {
  const [search, setSearch] = React.useState('');
  const [failedType, setFailedType] = React.useState('all');
  const [website, setWebsite] = React.useState('all');
  const [noteStatus, setNoteStatus] = React.useState('all');
  const [dateRange, setDateRange] = React.useState('last_30');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 150);
    return () => window.clearTimeout(timer);
  }, []);

  const data = filterMockFailedOrders({
    search: search || undefined,
    failedType:
      failedType === 'all'
        ? undefined
        : (failedType as 'duplicate' | 'blocked' | 'other'),
    website: website === 'all' ? undefined : website,
    page: 1,
    pageSize: 10,
  });

  return (
    <PageShell
      title="Failed Orders"
      description="Duplicate, blocked, or invalid orders for manual review. Auto-deleted after 90 days."
    >
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <CollapsibleSection title="Filtering" defaultOpen>
            <div className={cn('grid sm:grid-cols-2 lg:grid-cols-4', ORDER_SECTION_GRID_GAP)}>
              <FormField label="Date Range">
                <FormSelect
                  value={dateRange}
                  onChange={setDateRange}
                  options={[
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'last_7', label: 'Last 7 Days' },
                    { value: 'last_30', label: 'Last 30 Days' },
                    { value: 'max', label: 'Max' },
                  ]}
                  searchable={false}
                />
              </FormField>
              <FormField label="Type">
                <FormSelect
                  value={failedType}
                  onChange={setFailedType}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'duplicate', label: 'Duplicate' },
                    { value: 'blocked', label: 'Blocked' },
                    { value: 'other', label: 'Without Duplicate/Blocked' },
                  ]}
                  searchable={false}
                />
              </FormField>
              <FormField label="Note Status">
                <FormSelect
                  value={noteStatus}
                  onChange={setNoteStatus}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'has_note', label: 'Has Note' },
                    { value: 'no_note', label: 'No Note' },
                  ]}
                  searchable={false}
                />
              </FormField>
              <FormField label="Website">
                <FormSelect
                  value={website}
                  onChange={setWebsite}
                  options={[
                    { value: 'all', label: 'All' },
                    ...FAILED_ORDER_WEBSITES.map((site) => ({ value: site, label: site })),
                  ]}
                  searchable={false}
                />
              </FormField>
              <FormField label="Search" className="sm:col-span-2 lg:col-span-4">
                <FormInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search customer, phone, address…"
                />
              </FormField>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => {
                setSearch('');
                setFailedType('all');
                setWebsite('all');
                setNoteStatus('all');
                toast.success('Filters cleared');
              }}
            >
              Clear Filter
            </Button>
          </CollapsibleSection>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Failed Order Report (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className={cn('space-y-2 text-sm', ORDER_SECTION_BODY_CLASS)}>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total failed tracked</span>
                <span>{data.report.totalTracked.toLocaleString()} orders</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmed</span>
                <span className="text-emerald-600">{data.report.confirmed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Failed to confirmed</span>
                <span>{data.report.failedToConfirmedPercent}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          NB: Failed order will delete automatically after 90 days!
        </p>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Failed Order List</CardTitle>
          </CardHeader>
          <CardContent className="custom-scrollbar overflow-x-auto px-3 py-3 sm:px-4">
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <FailedOrdersTable rows={data.items} />
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
