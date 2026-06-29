'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { LeadListQuery } from '@laam/types';

import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { CrmListToolbar } from '@/features/crm/components/crm-list-toolbar';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadsTable } from '@/features/leads/components/leads-table';
import { getLeadPageCopy, LEAD_SOURCE_FILTERS } from '@/features/leads/config/lead-filters';
import { useLeadsList } from '@/features/leads/hooks/use-leads-list';
import { formatCurrency } from '@/lib/format';

type LeadsListPageProps = {
  status?: string;
  source?: string;
};

export function LeadsListPage({ status, source }: LeadsListPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCopy = getLeadPageCopy({ status, source });

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

  const query: LeadListQuery = {
    status:
      status === 'unassigned'
        ? 'unassigned'
        : status && status !== 'unassigned'
          ? (status as LeadListQuery['status'])
          : undefined,
    source: source as LeadListQuery['source'],
    search: debouncedSearch || undefined,
    page: 1,
    pageSize: 50,
  };

  const { data, isLoading, error } = useLeadsList(query);

  const summaryItems = [
    {
      id: 'count',
      label: 'Leads in view',
      value: data ? String(data.summary.count) : '—',
    },
    {
      id: 'value',
      label: 'Est. pipeline value',
      value: data ? formatCurrency(data.summary.totalEstimatedValue) : '—',
    },
    {
      id: 'unassigned',
      label: 'Unassigned',
      value: data ? String(data.summary.unassignedCount) : '—',
    },
    {
      id: 'page',
      label: 'Showing',
      value: data ? `${data.items.length} of ${data.total}` : '—',
      hint: 'Prototype pagination',
    },
  ];

  return (
    <PageShell title={pageCopy.title} description={pageCopy.description}>
      <div className="space-y-4">
        <CrmPageActions moduleId="leads" />

        <CrmSummaryStrip items={summaryItems} />

        <CrmListToolbar
          tabs={LEAD_SOURCE_FILTERS}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search lead, name, phone, campaign…"
        />

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">{pageCopy.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="custom-scrollbar overflow-x-auto px-3 py-3 sm:px-4">
              {isLoading ? (
                <LeadsTableSkeleton />
              ) : error ? (
                <p className="py-8 text-center text-sm text-destructive">{error}</p>
              ) : (
                <LeadsTable rows={data?.items ?? []} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function LeadsTableSkeleton() {
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
