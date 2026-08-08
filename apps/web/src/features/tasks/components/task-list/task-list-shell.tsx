'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { TaskDetail, TaskListItem, TaskPriority, TaskStatus } from '@laam/types';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { EmptyState } from '@/components/layout/empty-state';
import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { tasksApi } from '@/features/tasks/api/tasks-api';
import { TaskDataTable } from '@/features/tasks/components/task-list/task-data-table';
import { TaskFilterChips } from '@/features/tasks/components/task-list/task-filter-chips';
import { TaskListToolbar } from '@/features/tasks/components/task-list/task-list-toolbar';
import { TaskDetailsModal } from '@/features/tasks/components/task-list/modals/task-details-modal';
import { TaskNoteModal } from '@/features/tasks/components/task-list/modals/task-note-modal';
import { TaskSelectionBar } from '@/features/tasks/components/task-list/task-selection-bar';
import { TaskWorkspaceHeader } from '@/features/tasks/components/task-list/task-workspace-header';
import { useTaskMutations } from '@/features/tasks/hooks/use-task-mutations';
import { useTasksList } from '@/features/tasks/hooks/use-tasks-list';
import { cn } from '@/lib/utils';
import { CRM_PAGE_SIZE_OPTIONS } from '@/components/data-table/page-size-options';

const PAGE_SIZE_OPTIONS = [...CRM_PAGE_SIZE_OPTIONS];

export function TaskListShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { updateTask } = useTaskMutations();

  const filter = searchParams.get('filter') ?? 'all';

  const [search, setSearch] = React.useState(searchParams.get('search') ?? '');
  const [page, setPage] = React.useState(Number(searchParams.get('page') ?? 1));
  const [pageSize, setPageSize] = React.useState(Number(searchParams.get('pageSize') ?? 10));
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [listVersion, setListVersion] = React.useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<Date | null>(null);

  const [noteTarget, setNoteTarget] = React.useState<TaskListItem | null>(null);
  const [noteInitial, setNoteInitial] = React.useState('');
  const [detailsTarget, setDetailsTarget] = React.useState<TaskDetail | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const searchParamsKey = searchParams.toString();

  React.useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
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
  }, [debouncedSearch, filter, page, pageSize, pathname, router, searchParamsKey]);

  const { data, isLoading, error, refresh } = useTasksList(
    {
      filter: filter === 'all' ? undefined : (filter as 'my_tasks' | 'today' | 'overdue' | 'done'),
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
    { id: 'today', label: 'Due today', value: data ? String(data.summary.todayCount) : '—' },
    { id: 'overdue', label: 'Overdue', value: data ? String(data.summary.overdueCount) : '—' },
    { id: 'my', label: 'My tasks', value: data ? String(data.summary.myTasksCount) : '—' },
    { id: 'selected', label: 'Selected', value: String(selectedIds.size) },
  ];

  function handleRefresh() {
    setListVersion((v) => v + 1);
    void refresh();
  }

  function handleClearFilters() {
    setSearch('');
    setPage(1);
    router.replace('/dashboard/tasks');
  }

  async function patchRow(id: string, patch: Parameters<typeof tasksApi.updateTask>[1]) {
    await updateTask(id, patch);
    handleRefresh();
  }

  async function handleNoteClick(row: TaskListItem) {
    const detail = await tasksApi.getTask(row.id);
    setNoteInitial(detail?.notes ?? '');
    setNoteTarget(row);
  }

  async function handleDetailsClick(row: TaskListItem) {
    const detail = await tasksApi.getTask(row.id);
    if (detail) setDetailsTarget(detail);
  }

  async function handleNoteSave(note: string) {
    if (!noteTarget) return;
    await patchRow(noteTarget.id, { notes: note });
  }

  return (
    <PageShell
      title="Tasks"
      description="Calls, confirmations, courier checks, and payment follow-ups for your team."
    >
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <TaskWorkspaceHeader
          lastRefreshedAt={lastRefreshedAt}
          isRefreshing={isLoading}
          onRefresh={handleRefresh}
        />

        <CrmSummaryStrip items={summaryItems} className="sm:grid-cols-2 xl:grid-cols-5" />

        {data?.filters ? (
          <TaskFilterChips filters={data.filters} activeFilterId={filter} />
        ) : null}

        <TaskListToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />

        <ActiveFilterChips
          chips={[
            ...(filter !== 'all'
              ? [
                  {
                    id: 'filter',
                    label:
                      data?.filters?.find((f) => f.id === filter)?.label ?? filter,
                  },
                ]
              : []),
            ...(debouncedSearch.trim()
              ? [{ id: 'search', label: `Search: ${debouncedSearch.trim()}` }]
              : []),
          ]}
          onRemove={(id) => {
            if (id === 'search') {
              setSearch('');
              setPage(1);
              return;
            }
            if (id === 'filter') {
              setPage(1);
              router.replace('/dashboard/tasks');
            }
          }}
          onClearAll={handleClearFilters}
        />

        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
          <TaskSelectionBar
            selectedCount={selectedIds.size}
            selectedTaskIds={[...selectedIds]}
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
                  title="No tasks in this view"
                  description="Try another filter, or create a new task for your team."
                />
                <Button type="button" variant="outline" size="sm" onClick={handleClearFilters}>
                  Reset filters
                </Button>
              </div>
            ) : (
              <TaskDataTable
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
                onStatusChange={(row, status: TaskStatus) =>
                  void patchRow(row.id, { status })
                }
                onPriorityChange={(row, priority: TaskPriority) =>
                  void patchRow(row.id, { priority })
                }
                onDueDateChange={(row, date) => void patchRow(row.id, { dueDate: date })}
                onNoteClick={(row) => void handleNoteClick(row)}
                onMarkDone={(row) => void patchRow(row.id, { status: 'done' })}
                onDetailsClick={(row) => void handleDetailsClick(row)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <TaskNoteModal
        open={noteTarget !== null}
        onOpenChange={(open) => !open && setNoteTarget(null)}
        title={`Task notes — ${noteTarget?.title ?? ''}`}
        initialNote={noteInitial}
        onSave={handleNoteSave}
      />

      <TaskDetailsModal
        open={detailsTarget !== null}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
        task={detailsTarget}
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
