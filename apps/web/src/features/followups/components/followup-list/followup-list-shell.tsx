'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { FollowupDetail, FollowupListItem, FollowupQueue, FollowupStatus } from '@laam/types';
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
import { followupsApi } from '@/features/followups/api/followups-api';
import { FollowupDataTable } from '@/features/followups/components/followup-list/followup-data-table';
import { FollowupFilterChips } from '@/features/followups/components/followup-list/followup-filter-chips';
import { FollowupListToolbar } from '@/features/followups/components/followup-list/followup-list-toolbar';
import { FollowupDetailsModal } from '@/features/followups/components/followup-list/modals/followup-details-modal';
import { FollowupNoteModal } from '@/features/followups/components/followup-list/modals/followup-note-modal';
import { FollowupQueueTabs } from '@/features/followups/components/followup-list/followup-queue-tabs';
import { FollowupSelectionBar } from '@/features/followups/components/followup-list/followup-selection-bar';
import { FollowupWorkspaceHeader } from '@/features/followups/components/followup-list/followup-workspace-header';
import { useFollowupMutations } from '@/features/followups/hooks/use-followup-mutations';
import { useFollowupsList } from '@/features/followups/hooks/use-followups-list';
import { cn } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function parseQueue(value: string | null): FollowupQueue {
  if (value === '2') return 2;
  if (value === '3') return 3;
  return 1;
}

export function FollowupListShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { updateFollowup } = useFollowupMutations();

  const queue = parseQueue(searchParams.get('queue'));
  const filter = searchParams.get('filter') ?? 'all';

  const [search, setSearch] = React.useState(searchParams.get('search') ?? '');
  const [page, setPage] = React.useState(Number(searchParams.get('page') ?? 1));
  const [pageSize, setPageSize] = React.useState(Number(searchParams.get('pageSize') ?? 10));
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [listVersion, setListVersion] = React.useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<Date | null>(null);

  const [noteTarget, setNoteTarget] = React.useState<{
    row: FollowupListItem;
    kind: 'followup' | 'customer';
  } | null>(null);
  const [noteInitial, setNoteInitial] = React.useState('');
  const [detailsTarget, setDetailsTarget] = React.useState<FollowupDetail | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const searchParamsKey = searchParams.toString();

  React.useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    params.set('queue', String(queue));
    if (debouncedSearch) params.set('search', debouncedSearch);
    else params.delete('search');
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (filter && filter !== 'all') params.set('filter', filter);
    else params.delete('filter');
    const next = params.toString();
    if (next !== searchParamsKey) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [debouncedSearch, filter, page, pageSize, pathname, queue, router, searchParamsKey]);

  const { data, isLoading, error, refresh } = useFollowupsList(
    {
      queue,
      filter: filter === 'all' ? undefined : (filter as 'today' | 'no_status'),
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

  const queueCounts = React.useMemo(() => {
    const fromApi = data?.summary.queueCounts;
    if (fromApi) {
      return {
        1: fromApi[1],
        2: fromApi[2],
        3: fromApi[3],
      } as Partial<Record<FollowupQueue, number>>;
    }
    return {} as Partial<Record<FollowupQueue, number>>;
  }, [data?.summary.queueCounts]);

  const summaryItems = [
    { id: 'count', label: 'In this view', value: data ? String(data.summary.count) : '—' },
    { id: 'today', label: "Today's due", value: data ? String(data.summary.todayCount) : '—' },
    { id: 'nostatus', label: 'No status', value: data ? String(data.summary.noStatusCount) : '—' },
    { id: 'selected', label: 'Selected', value: String(selectedIds.size) },
  ];

  function handleRefresh() {
    setListVersion((v) => v + 1);
    void refresh();
  }

  function handleClearFilters() {
    setSearch('');
    setPage(1);
    router.replace(`/dashboard/followups?queue=${queue}`);
  }

  async function patchRow(id: string, patch: Parameters<typeof followupsApi.updateFollowup>[1]) {
    await updateFollowup(id, patch);
    handleRefresh();
  }

  async function handleFollowupNoteClick(row: FollowupListItem) {
    const detail = await followupsApi.getFollowup(row.id);
    setNoteInitial(detail?.followupNotes ?? '');
    setNoteTarget({ row, kind: 'followup' });
  }

  async function handleCustomerNoteClick(row: FollowupListItem) {
    const detail = await followupsApi.getFollowup(row.id);
    setNoteInitial(detail?.customerNotes ?? '');
    setNoteTarget({ row, kind: 'customer' });
  }

  async function handleDetailsClick(row: FollowupListItem) {
    const detail = await followupsApi.getFollowup(row.id);
    if (detail) setDetailsTarget(detail);
  }

  async function handleNoteSave(note: string) {
    if (!noteTarget) return;
    if (noteTarget.kind === 'followup') {
      await patchRow(noteTarget.row.id, { followupNotes: note });
    } else {
      await patchRow(noteTarget.row.id, { customerNotes: note });
    }
  }

  return (
    <PageShell
      title="Follow-ups"
      description="Customer callbacks — schedule, call, and convert to repeat orders."
    >
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <FollowupWorkspaceHeader
          lastRefreshedAt={lastRefreshedAt}
          isRefreshing={isLoading}
          onRefresh={handleRefresh}
        />

        <FollowupQueueTabs activeQueue={queue} counts={queueCounts} filter={filter} />

        <CrmSummaryStrip items={summaryItems} className="sm:grid-cols-2 xl:grid-cols-4" />

        {data?.filters ? (
          <FollowupFilterChips
            filters={data.filters}
            activeFilterId={filter}
            queue={queue}
          />
        ) : null}

        <FollowupListToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />

        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
          <FollowupSelectionBar
            selectedCount={selectedIds.size}
            selectedFollowupIds={[...selectedIds]}
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
                  title="No follow-ups in this view"
                  description="Try another queue or filter, or clear your search."
                />
                <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>
                  Reset filters
                </Button>
              </div>
            ) : (
              <FollowupDataTable
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
                rowOffset={(page - 1) * pageSize}
                onScheduleChange={(row, date) => void patchRow(row.id, { scheduleDate: date })}
                onSkip={(row) => void patchRow(row.id, { skipped: true })}
                onFollowupNoteClick={(row) => void handleFollowupNoteClick(row)}
                onCustomerNoteClick={(row) => void handleCustomerNoteClick(row)}
                onDetailsClick={(row) => void handleDetailsClick(row)}
                onStatusChange={(row, status: FollowupStatus) =>
                  void patchRow(row.id, { followupStatus: status })
                }
                onTagChange={(row, tag) =>
                  void patchRow(row.id, { tags: tag ? [tag] : [] })
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      <FollowupNoteModal
        open={noteTarget !== null}
        onOpenChange={(open) => !open && setNoteTarget(null)}
        title={
          noteTarget?.kind === 'customer'
            ? `Customer notes — ${noteTarget.row.name}`
            : `Follow-up notes — ${noteTarget?.row.name ?? ''}`
        }
        initialNote={noteInitial}
        onSave={handleNoteSave}
      />

      <FollowupDetailsModal
        open={detailsTarget !== null}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
        followup={detailsTarget}
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
