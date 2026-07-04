'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ContactListItem } from '@laam/types';

import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { CrmListToolbar } from '@/features/crm/components/crm-list-toolbar';
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
import { contactsApi } from '@/features/contacts/api/contacts-api';
import { ContactDataTable } from '@/features/contacts/components/contact-list/contact-data-table';
import { ContactNoteModal } from '@/features/contacts/components/contact-list/modals/contact-note-modal';
import { ContactSegmentChips } from '@/features/contacts/components/contact-list/contact-segment-chips';
import { ContactSelectionBar } from '@/features/contacts/components/contact-list/contact-selection-bar';
import { ContactWorkspaceHeader } from '@/features/contacts/components/contact-list/contact-workspace-header';
import { CONTACT_SOURCE_FILTERS, getContactPageCopy } from '@/features/contacts/config/contact-filters';
import { useContactMutations } from '@/features/contacts/hooks/use-contact-mutations';
import { useContactsList } from '@/features/contacts/hooks/use-contacts-list';
import { cn } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

type ContactListShellProps = {
  source?: string;
};

export function ContactListShell({ source }: ContactListShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCopy = getContactPageCopy();
  const { updateContact } = useContactMutations();

  const [search, setSearch] = React.useState(searchParams.get('search') ?? '');
  const [page, setPage] = React.useState(Number(searchParams.get('page') ?? 1));
  const [pageSize, setPageSize] = React.useState(Number(searchParams.get('pageSize') ?? 10));
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [listVersion, setListVersion] = React.useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<Date | null>(null);
  const [noteTarget, setNoteTarget] = React.useState<ContactListItem | null>(null);
  const [noteInitial, setNoteInitial] = React.useState('');

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
    if (source) params.set('source', source);
    else params.delete('source');
    const next = params.toString();
    if (next !== searchParamsKey) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [debouncedSearch, page, pageSize, pathname, router, searchParamsKey, segment, source]);

  const { data, isLoading, error, refresh } = useContactsList(
    {
      segment: segment === 'all' ? undefined : segment,
      source: source as ContactListItem['source'] | undefined,
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
      id: 'customers',
      label: 'Customers',
      value: data ? String(data.summary.customerCount) : '—',
    },
    {
      id: 'suppliers',
      label: 'Suppliers',
      value: data ? String(data.summary.supplierCount) : '—',
    },
    {
      id: 'courier',
      label: 'Avg courier',
      value: data ? `${data.summary.avgCourierRate.toFixed(1)}%` : '—',
    },
  ];

  function handleRefresh() {
    setListVersion((v) => v + 1);
    void refresh();
  }

  function handleClearFilters() {
    setSearch('');
    setPage(1);
    router.replace('/dashboard/contacts');
  }

  async function handleNoteClick(row: ContactListItem) {
    const detail = await contactsApi.getContact(row.id);
    setNoteInitial(detail?.notes ?? '');
    setNoteTarget(row);
  }

  async function handleNoteSave(note: string) {
    if (!noteTarget) return;
    await updateContact(noteTarget.id, { notes: note });
    handleRefresh();
  }

  function handleFollowUpClick(row: ContactListItem) {
    void import('sonner').then(({ toast }) => {
      toast.info(
        row.hasFollowUp
          ? `Follow-up due ${row.followUpDue ?? 'soon'} for ${row.name}`
          : `Set follow-up for ${row.name} via bulk actions`,
      );
    });
  }

  return (
    <PageShell title={pageCopy.title} description={pageCopy.description}>
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <ContactWorkspaceHeader
          lastRefreshedAt={lastRefreshedAt}
          isRefreshing={isLoading}
          onRefresh={handleRefresh}
        />

        <CrmPageActions moduleId="contacts" />

        <CrmSummaryStrip items={summaryItems} className="sm:grid-cols-2 xl:grid-cols-4" />

        {data?.segments ? (
          <ContactSegmentChips
            segments={data.segments}
            activeSegmentId={segment}
            source={source}
          />
        ) : null}

        <CrmListToolbar
          tabs={CONTACT_SOURCE_FILTERS}
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="Search name, mobile, ID, organization…"
        />

        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
          <ContactSelectionBar
            selectedCount={selectedIds.size}
            selectedContactIds={[...selectedIds]}
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
                  title="No contacts in this view"
                  description="Try another segment or source filter, or clear your search."
                />
                <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>
                  Reset filters
                </Button>
              </div>
            ) : (
              <ContactDataTable
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
                onFollowUpClick={handleFollowUpClick}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ContactNoteModal
        open={noteTarget !== null}
        onOpenChange={(open) => !open && setNoteTarget(null)}
        contactName={noteTarget?.name ?? ''}
        initialNote={noteInitial}
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
