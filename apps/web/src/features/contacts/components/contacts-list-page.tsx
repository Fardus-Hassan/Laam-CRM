'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ContactListQuery } from '@laam/types';

import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { CrmListToolbar } from '@/features/crm/components/crm-list-toolbar';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ContactsTable } from '@/features/contacts/components/contacts-table';
import { CONTACT_SOURCE_FILTERS, getContactPageCopy } from '@/features/contacts/config/contact-filters';
import { useContactsList } from '@/features/contacts/hooks/use-contacts-list';

type ContactsListPageProps = { source?: string };

export function ContactsListPage({ source }: ContactsListPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCopy = getContactPageCopy(source);
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

  const query: ContactListQuery = {
    source: source as ContactListQuery['source'],
    search: debouncedSearch || undefined,
    page: 1,
    pageSize: 50,
  };

  const { data, isLoading, error } = useContactsList(query);

  return (
    <PageShell title={pageCopy.title} description={pageCopy.description}>
      <div className="space-y-4">
        <CrmPageActions moduleId="contacts" />
        <CrmSummaryStrip
          items={[
            { id: 'count', label: 'Contacts', value: data ? String(data.summary.count) : '—' },
            { id: 'company', label: 'With company', value: data ? String(data.summary.withCompanyCount) : '—' },
            { id: 'showing', label: 'Showing', value: data ? `${data.items.length} of ${data.total}` : '—' },
          ]}
        />
        <CrmListToolbar
          tabs={CONTACT_SOURCE_FILTERS}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search name, phone, email, company…"
        />
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">{pageCopy.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="custom-scrollbar overflow-x-auto px-3 py-3 sm:px-4">
              {isLoading ? (
                <div className="space-y-3 py-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : error ? (
                <p className="py-8 text-center text-sm text-destructive">{error}</p>
              ) : (
                <ContactsTable rows={data?.items ?? []} />
              )}
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
