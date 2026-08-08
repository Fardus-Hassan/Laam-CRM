'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { AppNotification } from '@laam/types';
import { Trash2 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { DatePicker } from '@/components/date-range/date-picker';
import { DateRangePicker } from '@/components/date-range/date-range-picker';
import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  notificationsApi,
  type NotificationListQuery,
} from '@/features/notifications/api/notifications-api';
import { toISODateRange } from '@/lib/date-range';
import { formatNotificationTime } from '@/lib/format-relative-time';
import { cn } from '@/lib/utils';

type DateMode = 'single' | 'range';

type Filters = {
  search: string;
  dateMode: DateMode;
  singleDate: Date | undefined;
  range: DateRange | undefined;
};

const EMPTY_FILTERS: Filters = {
  search: '',
  dateMode: 'single',
  singleDate: undefined,
  range: undefined,
};

function toListQuery(filters: Filters): NotificationListQuery {
  const query: NotificationListQuery = { limit: 20 };
  if (filters.search.trim()) query.search = filters.search.trim();
  if (filters.dateMode === 'single') {
    if (filters.singleDate) {
      query.date = format(filters.singleDate, 'yyyy-MM-dd');
    }
  } else {
    const iso = toISODateRange(filters.range);
    if (iso) {
      query.dateFrom = iso.from;
      query.dateTo = iso.to;
    } else if (filters.range?.from && !filters.range.to) {
      query.date = format(filters.range.from, 'yyyy-MM-dd');
    }
  }
  return query;
}

export function NotificationsInboxPage() {
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = React.useState<Filters>(EMPTY_FILTERS);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const appliedRef = React.useRef(applied);
  appliedRef.current = applied;

  const loadInitial = React.useCallback(async (filters: Filters) => {
    setLoading(true);
    try {
      const page = await notificationsApi.list(toListQuery(filters));
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setSelected(new Set());
    } catch {
      setItems([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadInitial(applied);
  }, [applied, loadInitial]);

  const loadMore = React.useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await notificationsApi.list({
        ...toListQuery(appliedRef.current),
        cursor: nextCursor,
      });
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...page.items.filter((item) => !seen.has(item.id))];
      });
      setNextCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor]);

  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !nextCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, nextCursor]);

  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(items.map((item) => item.id)) : new Set());
  }

  function handleApplyFilters(event: React.FormEvent) {
    event.preventDefault();
    setApplied({ ...draft });
  }

  function handleClearFilters() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  }

  async function handleMarkRead(item: AppNotification) {
    if (item.isRead) return;
    await notificationsApi.markRead(item.id);
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, isRead: true } : row)),
    );
  }

  async function handleMarkAll() {
    await notificationsApi.markAllRead();
    setItems((prev) => prev.map((row) => ({ ...row, isRead: true })));
  }

  async function handleDeleteOne(id: string) {
    setBusy(true);
    try {
      await notificationsApi.deleteOne(id);
      setItems((prev) => prev.filter((row) => row.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      await notificationsApi.deleteMany(ids);
      const removed = new Set(ids);
      setItems((prev) => prev.filter((row) => !removed.has(row.id)));
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Notifications"
      description="Alerts from login security, invites, and system events. Older than 30 days are removed automatically."
    >
      <form
        onSubmit={handleApplyFilters}
        className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:p-4"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="notification-search">Search</Label>
            <Input
              id="notification-search"
              value={draft.search}
              onChange={(event) => setDraft((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Title, body, or type…"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={draft.dateMode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDraft((prev) => ({ ...prev, dateMode: 'single' }))}
            >
              Single date
            </Button>
            <Button
              type="button"
              variant={draft.dateMode === 'range' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDraft((prev) => ({ ...prev, dateMode: 'range' }))}
            >
              Date range
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{draft.dateMode === 'single' ? 'Date' : 'Date range'}</Label>
          {draft.dateMode === 'single' ? (
            <DatePicker
              value={draft.singleDate}
              onChange={(date) => setDraft((prev) => ({ ...prev, singleDate: date }))}
              align="start"
              className="w-full sm:w-auto"
              placeholder="Pick a date"
            />
          ) : (
            <DateRangePicker
              value={draft.range}
              onChange={(range) => setDraft((prev) => ({ ...prev, range }))}
              align="start"
              className="w-full sm:w-auto"
              placeholder="Pick a date range"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm">
            Apply filters
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear
          </Button>
        </div>
      </form>

      <ActiveFilterChips
        className="mt-3"
        chips={[
          ...(applied.search.trim()
            ? [{ id: 'search', label: `Search: ${applied.search.trim()}` }]
            : []),
          ...(applied.dateMode === 'single' && applied.singleDate
            ? [
                {
                  id: 'date',
                  label: `Date: ${format(applied.singleDate, 'dd MMM yyyy')}`,
                },
              ]
            : []),
          ...(applied.dateMode === 'range' && applied.range?.from
            ? [
                {
                  id: 'date',
                  label: applied.range.to
                    ? `Date: ${format(applied.range.from, 'dd MMM yyyy')} → ${format(applied.range.to, 'dd MMM yyyy')}`
                    : `Date: ${format(applied.range.from, 'dd MMM yyyy')}`,
                },
              ]
            : []),
        ]}
        onRemove={(id) => {
          if (id === 'search') {
            setDraft((prev) => ({ ...prev, search: '' }));
            setApplied((prev) => ({ ...prev, search: '' }));
            return;
          }
          if (id === 'date') {
            setDraft((prev) => ({
              ...prev,
              singleDate: undefined,
              range: undefined,
            }));
            setApplied((prev) => ({
              ...prev,
              singleDate: undefined,
              range: undefined,
            }));
          }
        }}
        onClearAll={handleClearFilters}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {items.length > 0 ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(value) => toggleAll(value === true)}
                aria-label="Select all notifications"
              />
              Select all
            </label>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {items.filter((item) => !item.isRead).length} unread
            {selected.size > 0 ? ` · ${selected.size} selected` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.size > 0 ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => void handleDeleteSelected()}
            >
              Delete selected
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => void handleMarkAll()}>
            Mark all read
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading notifications…</p>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No notifications match</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                'flex items-start gap-2 px-1 py-3 sm:gap-3 sm:px-2',
                !item.isRead && 'bg-primary/5',
              )}
            >
              <Checkbox
                className="mt-1"
                checked={selected.has(item.id)}
                onCheckedChange={(value) => toggleOne(item.id, value === true)}
                aria-label={`Select ${item.title}`}
              />
              <Link
                href={item.href ?? '#'}
                onClick={() => void handleMarkRead(item)}
                className="min-w-0 flex-1 flex flex-col gap-1 transition-colors hover:opacity-90"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{item.title}</span>
                  <time className="text-xs text-muted-foreground" dateTime={item.createdAt}>
                    {formatNotificationTime(item.createdAt)}
                  </time>
                </div>
                <p className="text-sm text-muted-foreground">{item.body}</p>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                  {item.type.replaceAll('_', ' ')}
                </span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-0.5 size-8 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={busy}
                aria-label={`Delete ${item.title}`}
                onClick={() => void handleDeleteOne(item.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinelRef} className="h-8" aria-hidden />
      {loadingMore ? (
        <p className="pb-6 text-center text-xs text-muted-foreground">Loading more…</p>
      ) : null}
    </PageShell>
  );
}
