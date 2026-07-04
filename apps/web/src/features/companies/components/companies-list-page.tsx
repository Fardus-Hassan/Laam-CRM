'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CompanyListQuery } from '@laam/types';

import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { CrmListToolbar } from '@/features/crm/components/crm-list-toolbar';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CompaniesTable } from '@/features/companies/components/companies-table';
import { COMPANY_STATUS_FILTERS, getCompanyPageCopy } from '@/features/companies/config/company-filters';
import { useCompaniesList } from '@/features/companies/hooks/use-companies-list';
import { formatCurrency } from '@/lib/format';

type CompaniesListPageProps = { status?: string };

export function CompaniesListPage({ status }: CompaniesListPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCopy = getCompanyPageCopy(status);
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

  const query: CompanyListQuery = {
    status: status as CompanyListQuery['status'],
    search: debouncedSearch || undefined,
    page: 1,
    pageSize: 50,
  };

  const { data, isLoading, error } = useCompaniesList(query);

  return (
    <PageShell title={pageCopy.title} description={pageCopy.description}>
      <div className="space-y-4">
        <CrmPageActions moduleId="companies" />
        <CrmSummaryStrip
          items={[
            { id: 'count', label: 'Customers', value: data ? String(data.summary.count) : '—' },
            { id: 'value', label: 'Total spent', value: data ? formatCurrency(data.summary.totalDealValue) : '—' },
            { id: 'active', label: 'Repeat buyers', value: data ? String(data.summary.activeCount) : '—' },
          ]}
        />
        <CrmListToolbar tabs={COMPANY_STATUS_FILTERS} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search name, mobile, area, district…" />
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">{pageCopy.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="custom-scrollbar overflow-x-auto px-3 py-3 sm:px-4">
              {isLoading ? <Skeleton className="h-48 w-full" /> : error ? <p className="py-8 text-center text-sm text-destructive">{error}</p> : <CompaniesTable rows={data?.items ?? []} />}
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
