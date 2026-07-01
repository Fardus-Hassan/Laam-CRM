'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { LeadListItem, OrderSource } from '@laam/types';

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
import { leadsApi } from '@/features/leads/api/leads-api';
import type { LeadListContext } from '@/features/leads/config/lead-list-context';
import { buildLeadTabHref } from '@/features/leads/config/lead-list-context';
import { LeadDataTable } from '@/features/leads/components/lead-list/lead-data-table';
import {
  EMPTY_LEAD_FILTERS,
  LeadListToolbar,
  type LeadFilterValues,
} from '@/features/leads/components/lead-list/lead-list-toolbar';
import { LeadNoteModal } from '@/features/leads/components/lead-list/modals/lead-note-modal';
import { LeadPipelinePanel } from '@/features/leads/components/lead-list/lead-pipeline-panel';
import { LeadSelectionBar } from '@/features/leads/components/lead-list/lead-selection-bar';
import { LeadWorkspaceHeader } from '@/features/leads/components/lead-list/lead-workspace-header';
import { useLeadMutations } from '@/features/leads/hooks/use-lead-mutations';
import { useLeadPipeline } from '@/features/leads/hooks/use-lead-pipeline';
import { useLeadsList } from '@/features/leads/hooks/use-leads-list';
import { navigateToConvertLead } from '@/features/leads/lib/lead-convert';
import { createLeadsListBreadcrumbs } from '@/features/leads/lib/lead-breadcrumbs';
import { cn } from '@/lib/utils';

type LeadListShellProps = {
  context: LeadListContext;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function LeadListShell({ context }: LeadListShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { updateLead } = useLeadMutations();

  const [search, setSearch] = React.useState(searchParams.get('search') ?? '');
  const [page, setPage] = React.useState(Number(searchParams.get('page') ?? 1));
  const [pageSize, setPageSize] = React.useState(Number(searchParams.get('pageSize') ?? 10));
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [sort, setSort] = React.useState<{ id: string; desc: boolean } | null>(null);
  const [filters, setFilters] = React.useState<LeadFilterValues>({
    source: context.sourceFilter,
    agent: searchParams.get('agent') ?? undefined,
  });
  const [filtersOpen, setFiltersOpen] = React.useState(Boolean(searchParams.get('agent')));
  const [listVersion, setListVersion] = React.useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<Date | null>(null);
  const [noteTarget, setNoteTarget] = React.useState<LeadListItem | null>(null);
  const [noteInitial, setNoteInitial] = React.useState('');

  const debouncedSearch = useDebouncedValue(search, 300);
  const searchParamsKey = searchParams.toString();

  React.useEffect(() => {
    setFilters((current) => ({
      ...current,
      source: context.sourceFilter,
    }));
  }, [context.sourceFilter]);

  React.useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (context.statusFilter) {
      params.set('status', context.statusFilter);
    }
    const source = filters.source ?? context.sourceFilter;
    if (source) {
      params.set('source', source);
    } else {
      params.delete('source');
    }
    if (filters.agent) {
      params.set('agent', filters.agent);
    } else {
      params.delete('agent');
    }
    const next = params.toString();
    if (next !== searchParamsKey) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [
    debouncedSearch,
    page,
    pageSize,
    pathname,
    context.statusFilter,
    filters.source,
    filters.agent,
    context.sourceFilter,
    router,
    searchParamsKey,
  ]);

  const sourceFilter = filters.source ?? context.sourceFilter;

  const pipelineQuery = React.useMemo(
    () => ({
      source: sourceFilter,
      agent: filters.agent,
    }),
    [sourceFilter, filters.agent],
  );

  const { stats: pipelineStats, isLoading: pipelineLoading } = useLeadPipeline(
    pipelineQuery,
    listVersion,
  );

  const { data, isLoading, error, refresh } = useLeadsList(
    {
      status: context.statusFilter,
      source: sourceFilter,
      agent: filters.agent,
      search: debouncedSearch || undefined,
      page,
      pageSize,
    },
    listVersion,
  );

  React.useEffect(() => {
    if (data && !isLoading) {
      setLastRefreshedAt(new Date());
    }
  }, [data, isLoading]);

  const selectedRows = React.useMemo(
    () => (data?.items ?? []).filter((row) => selectedIds.has(row.id)),
    [data?.items, selectedIds],
  );

  const summaryItems = [
    { id: 'count', label: 'In this view', value: data ? String(data.summary.count) : '—' },
    {
      id: 'selected',
      label: 'Selected',
      value: String(selectedIds.size),
    },
    {
      id: 'page',
      label: 'Page',
      value: data ? `${data.page} of ${Math.max(1, Math.ceil(data.total / data.pageSize))}` : '—',
    },
  ];

  function handleRefresh() {
    setListVersion((v) => v + 1);
    void refresh();
  }

  function handleClearFilters() {
    setSearch('');
    setFilters(EMPTY_LEAD_FILTERS);
    setPage(1);
    router.replace(buildLeadTabHref(context.activeTabId));
  }

  function handleSourceChange(source: OrderSource | undefined) {
    setFilters((current) => ({ ...current, source }));
    setPage(1);
    router.replace(buildLeadTabHref(context.activeTabId, source));
  }

  function handleAgentChange(agent: string | undefined) {
    setFilters((current) => ({ ...current, agent }));
    setPage(1);
  }

  async function handleNoteClick(row: LeadListItem) {
    const detail = await leadsApi.getLead(row.leadNumber);
    setNoteInitial(detail?.notes ?? '');
    setNoteTarget(row);
  }

  async function handleNoteSave(note: string) {
    if (!noteTarget) return;
    await updateLead(noteTarget.id, { notes: note });
    handleRefresh();
  }

  function handleConvertClick(row: LeadListItem) {
    void navigateToConvertLead(row.id, router);
  }

  return (
    <PageShell
      title="Leads"
      description="Pre-orders from Facebook, phone, and shop — qualify buyers and convert to orders."
      breadcrumbs={createLeadsListBreadcrumbs(context.title)}
    >
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0 overflow-x-hidden')}>
        <LeadWorkspaceHeader
          title={context.title}
          description={context.description}
          lastRefreshedAt={lastRefreshedAt}
          isRefreshing={isLoading}
          onRefresh={handleRefresh}
        />

        <CrmPageActions moduleId="leads" />

        <CrmSummaryStrip items={summaryItems} className="sm:grid-cols-3" />

        <LeadPipelinePanel
          stats={pipelineStats}
          isLoading={pipelineLoading}
          activeTabId={context.activeTabId}
          sourceFilter={sourceFilter}
          hasAgentFilter={Boolean(filters.agent)}
        />

        <LeadListToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          filters={filters}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((open) => !open)}
          onClearFilters={handleClearFilters}
          onSourceChange={handleSourceChange}
          onAgentChange={handleAgentChange}
        />

        <Card className={cn(ORDER_CARD_CLASS, 'overflow-hidden')}>
          <LeadSelectionBar
            selectedCount={selectedIds.size}
            selectedLeadIds={[...selectedIds]}
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
                  title="No leads in this pipeline stage"
                  description="Try another status tab, change the source filter, or clear search."
                />
                <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>
                  Reset filters
                </Button>
              </div>
            ) : (
              <LeadDataTable
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
                sort={sort}
                onSortChange={setSort}
                onNoteClick={(row) => void handleNoteClick(row)}
                onConvertClick={handleConvertClick}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <LeadNoteModal
        open={noteTarget !== null}
        onOpenChange={(open) => !open && setNoteTarget(null)}
        leadNumber={noteTarget?.leadNumber ?? ''}
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
