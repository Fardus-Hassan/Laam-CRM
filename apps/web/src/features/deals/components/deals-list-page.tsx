'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DealListQuery } from '@laam/types';

import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { CrmListToolbar } from '@/features/crm/components/crm-list-toolbar';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DealsTable } from '@/features/deals/components/deals-table';
import { DEAL_STAGE_FILTERS, getDealPageCopy } from '@/features/deals/config/deal-filters';
import { useDealsList } from '@/features/deals/hooks/use-deals-list';
import { formatCurrency } from '@/lib/format';

type DealsListPageProps = { stage?: string };

export function DealsListPage({ stage }: DealsListPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCopy = getDealPageCopy(stage);
  const [search, setSearch] = React.useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search, 300);

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set('search', debouncedSearch);
    else params.delete('search');
    const next = params.toString();
    if (next !== searchParams.toString()) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [debouncedSearch, pathname, router, searchParams]);

  const query: DealListQuery = {
    stage: stage as DealListQuery['stage'],
    search: debouncedSearch || undefined,
    page: 1,
    pageSize: 50,
  };

  const { data, isLoading, error } = useDealsList(query);

  return (
    <PageShell title={pageCopy.title} description={pageCopy.description}>
      <div className="space-y-4">
        <CrmPageActions moduleId="deals" />
        <CrmSummaryStrip
          items={[
            { id: 'count', label: 'Deals', value: data ? String(data.summary.count) : '—' },
            { id: 'amount', label: 'Total value', value: data ? formatCurrency(data.summary.totalAmount) : '—' },
            { id: 'weighted', label: 'Weighted forecast', value: data ? formatCurrency(Math.round(data.summary.weightedAmount)) : '—' },
          ]}
        />
        <CrmListToolbar tabs={DEAL_STAGE_FILTERS} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search deal, customer, contact…" />
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">{pageCopy.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="custom-scrollbar overflow-x-auto px-3 py-3 sm:px-4">
              {isLoading ? <Skeleton className="h-48 w-full" /> : error ? <p className="py-8 text-center text-sm text-destructive">{error}</p> : <DealsTable rows={data?.items ?? []} />}
            </div>
          </CardContent>
        </Card>
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
