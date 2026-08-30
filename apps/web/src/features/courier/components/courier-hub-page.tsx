'use client';

import * as React from 'react';
import Link from 'next/link';
import type {
  CourierOverview,
  CourierProvider,
  CourierReadyListResponse,
  CourierSubmitItem,
} from '@laam/types';
import { CheckCircle2, Package, RefreshCw, Send, Truck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { CrmDataTableMeta } from '@/components/data-table/crm-data-table-meta';
import { CrmDataTablePagination } from '@/components/data-table/crm-data-table-pagination';
import {
  clampCrmPageSize,
  CRM_PAGE_SIZE_OPTIONS,
} from '@/components/data-table/page-size-options';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { courierApi } from '@/features/courier/api/courier-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency, formatTime } from '@/lib/format';
import { usePageDataRefresh } from '@/lib/page-data-refresh';
import { cn } from '@/lib/utils';

const EVENT_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  picked: 'Picked',
  in_transit: 'In transit',
  delivered: 'Delivered',
  returned: 'Returned',
  cod_collected: 'COD collected',
  failed: 'Failed',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
  error: 'destructive',
};

const PAGE_SIZE_OPTIONS = [...CRM_PAGE_SIZE_OPTIONS];

export function CourierHubPage() {
  const [data, setData] = React.useState<CourierOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);
  const [settlingId, setSettlingId] = React.useState<string | null>(null);
  const [submitProvider, setSubmitProvider] = React.useState<CourierProvider>('pathao');

  const [readyPage, setReadyPage] = React.useState(1);
  const [readyPageSize, setReadyPageSize] = React.useState(25);
  const [readySearch, setReadySearch] = React.useState('');
  const [readyDebouncedSearch, setReadyDebouncedSearch] = React.useState('');
  const [readyLoading, setReadyLoading] = React.useState(false);
  const [readyList, setReadyList] = React.useState<CourierReadyListResponse | null>(null);

  React.useEffect(() => {
    const t = window.setTimeout(() => setReadyDebouncedSearch(readySearch.trim()), 300);
    return () => window.clearTimeout(t);
  }, [readySearch]);

  React.useEffect(() => {
    setReadyPage(1);
  }, [readyDebouncedSearch, readyPageSize]);

  const refreshOverview = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await courierApi.getOverview();
      setData(overview);
      setSubmitProvider((prev) => {
        const connected = new Set(
          overview.accounts.filter((a) => a.status === 'active').map((a) => a.provider),
        );
        if (connected.has(prev)) return prev;
        if (connected.has(overview.rules.defaultProvider)) {
          return overview.rules.defaultProvider;
        }
        const first = overview.accounts.find((a) => a.status === 'active')?.provider;
        return first ?? overview.rules.defaultProvider ?? 'pathao';
      });
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Failed to load courier hub');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshReady = React.useCallback(async () => {
    setReadyLoading(true);
    try {
      const list = await courierApi.listReady({
        page: readyPage,
        pageSize: readyPageSize,
        search: readyDebouncedSearch || undefined,
      });
      setReadyList(list);
    } catch (e) {
      setReadyList(null);
      toast.error(e instanceof Error ? e.message : 'Failed to load ready queue');
    } finally {
      setReadyLoading(false);
    }
  }, [readyPage, readyPageSize, readyDebouncedSearch]);

  const refreshAll = React.useCallback(async () => {
    await Promise.all([refreshOverview(), refreshReady()]);
  }, [refreshOverview, refreshReady]);

  React.useEffect(() => {
    void refreshOverview();
  }, [refreshOverview]);

  React.useEffect(() => {
    void refreshReady();
  }, [refreshReady]);

  usePageDataRefresh(() => {
    void refreshAll();
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage(items: CourierSubmitItem[]) {
    const ids = items.map((r) => r.orderId);
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  }

  async function handleMarkRead(eventId: string, isRead: boolean) {
    if (isRead) return;
    setData((prev) =>
      prev
        ? {
            ...prev,
            inbox: prev.inbox.map((ev) =>
              ev.id === eventId ? { ...ev, isRead: true } : ev,
            ),
          }
        : prev,
    );
    try {
      await courierApi.markInboxRead(eventId);
    } catch {
      // Keep optimistic UI; next refresh corrects.
    }
  }

  async function handleSubmit() {
    if (!selected.size || !data) return;
    setSubmitting(true);
    try {
      const result = await courierApi.submitOrders([...selected], submitProvider);
      setSelected(new Set());
      if (result.failed && result.failed > 0) {
        toast.warning(result.message ?? `Booked ${result.submitted}, ${result.failed} failed`);
      } else {
        toast.success(result.message ?? `Booked ${result.submitted} order(s)`);
      }
      await refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSettle(orderId: string, orderNumber: string) {
    setSettlingId(orderId);
    try {
      await courierApi.settleCod(orderId);
      toast.success(`Settled ${orderNumber}`);
      await refreshOverview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Settlement failed');
    } finally {
      setSettlingId(null);
    }
  }

  const pendingSettlement =
    data?.inbox.filter((e) => e.type === 'delivered') ?? [];

  const readyItems = readyList?.items ?? [];
  const readyTotal = readyList?.total ?? data?.stats.readyCount ?? 0;
  const pageIds = readyItems.map((r) => r.orderId);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  return (
    <PageShell
      title="Courier Dashboard"
      description="Courier accounts, bulk submit, and live tracking inbox."
    >
      <div className={ORDER_PAGE_GAP}>
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={() => void refreshAll()}>
            <RefreshCw className={cn('size-4', (loading || readyLoading) && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <CrmSummaryStrip
          items={[
            {
              id: 'ready',
              label: 'Ready to submit',
              value: data ? String(data.stats.readyCount ?? readyTotal) : '—',
            },
            {
              id: 'sub',
              label: 'Submitted today',
              value: data ? String(data.stats.submittedToday) : '—',
            },
            {
              id: 'transit',
              label: 'In transit',
              value: data ? String(data.stats.inTransit) : '—',
            },
            {
              id: 'del',
              label: 'Delivered today',
              value: data ? String(data.stats.deliveredToday) : '—',
            },
            {
              id: 'fail',
              label: 'Failed today',
              value: data ? String(data.stats.failedToday) : '—',
            },
          ]}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Courier accounts</CardTitle>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
              {data?.accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Truck className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {acc.label}
                        {acc.isDefault ? (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            Default
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {acc.consignmentsToday} today · {acc.successRate}% success
                      </p>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[acc.status] ?? 'secondary'}>{acc.status}</Badge>
                </div>
              ))}
              {!loading && data && data.accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No courier connected.{' '}
                  <Link
                    href="/dashboard/settings/integrations"
                    className="font-medium text-primary underline"
                  >
                    Open Integrations
                  </Link>
                </p>
              ) : null}
              {data ? (
                <p className="text-xs text-muted-foreground">
                  Default: {data.rules.defaultProvider} · COD{' '}
                  {data.rules.codEnabled ? `on (${data.rules.codChargePercent}%)` : 'off'}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Tracking inbox</CardTitle>
            </CardHeader>
            <CardContent
              className={cn(ORDER_SECTION_BODY_CLASS, 'max-h-80 space-y-2 overflow-y-auto')}
            >
              {data?.inbox.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  className={cn(
                    'w-full rounded-md border px-3 py-2 text-left text-sm transition-colors',
                    !ev.isRead && 'border-primary/30 bg-primary/5',
                    'hover:bg-muted/40',
                  )}
                  onClick={() => void handleMarkRead(ev.id, ev.isRead)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {EVENT_LABELS[ev.type] ?? ev.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(ev.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 font-medium">
                    <Link
                      href={`/dashboard/orders/${ev.orderNumber}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ev.orderNumber}
                    </Link>
                    {' · '}
                    {ev.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground">{ev.message}</p>
                </button>
              ))}
              {!loading && data && data.inbox.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No courier tracking events yet. Book an order to see updates here.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader
            className={cn(
              ORDER_SECTION_HEADER_CLASS,
              'flex-row flex-wrap items-center justify-between gap-2',
            )}
          >
            <CardTitle className="text-sm">Ready to submit</CardTitle>
            <Can permission="courier.manage">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Provider
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
                    value={submitProvider}
                    onChange={(e) => setSubmitProvider(e.target.value as CourierProvider)}
                    disabled={submitting || !data?.accounts.length}
                  >
                    {(data?.accounts.length
                      ? data.accounts
                      : [
                          { provider: 'pathao', label: 'Pathao' },
                          { provider: 'carrybee', label: 'Carrybee' },
                        ]
                    ).map((acc) => (
                      <option key={acc.provider} value={acc.provider}>
                        {acc.label ?? acc.provider}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  size="sm"
                  disabled={!selected.size || submitting}
                  onClick={() => void handleSubmit()}
                >
                  <Send className="size-4" />
                  {submitting ? 'Submitting…' : `Submit ${selected.size || ''}`.trim()}
                </Button>
              </div>
            </Can>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            <div className="border-b px-3 py-2">
              <Input
                value={readySearch}
                onChange={(e) => setReadySearch(e.target.value)}
                placeholder="Search order, customer, phone, district…"
                className="h-8 max-w-md"
              />
            </div>
            <CrmDataTableMeta
              page={readyPage}
              pageSize={readyPageSize}
              total={readyTotal}
              entityLabel="orders"
              selectedCount={selected.size}
              onClearSelection={() => setSelected(new Set())}
              onPageSizeChange={(size) => {
                setReadyPageSize(clampCrmPageSize(size, 25));
              }}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[4.5rem]">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={allPageSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = somePageSelected && !allPageSelected;
                          }}
                          onChange={() => togglePage(readyItems)}
                          disabled={readyItems.length === 0}
                          aria-label="Select page"
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                          #
                        </span>
                      </div>
                    </TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readyItems.map((row, index) => (
                    <TableRow key={row.orderId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selected.has(row.orderId)}
                            onChange={() => toggle(row.orderId)}
                            className="size-4"
                          />
                          <span className="min-w-[1.15rem] text-center text-[11px] font-medium tabular-nums text-muted-foreground">
                            {(readyPage - 1) * readyPageSize + index + 1}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/orders/${row.orderNumber}`}
                          className="hover:underline"
                        >
                          {row.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{row.customerName}</TableCell>
                      <TableCell>{row.district}</TableCell>
                      <TableCell>{formatCurrency(row.amountBdt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {readyLoading && readyItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {!readyLoading && readyItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        {readyDebouncedSearch
                          ? 'No matching orders in the ready queue.'
                          : 'No orders ready. Confirm an order (with address) to queue it here for bulk Pathao/Carrybee submit.'}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
            <CrmDataTablePagination
              page={readyPage}
              pageSize={readyPageSize}
              total={readyTotal}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setReadyPage}
              onPageSizeChange={(size) => {
                setReadyPageSize(clampCrmPageSize(size, 25));
              }}
              showRangeSummary={false}
            />
          </CardContent>
        </Card>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">COD settlement</CardTitle>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-2')}>
            <p className="text-xs text-muted-foreground">
              Delivered courier orders that still need COD marked paid.
            </p>
            {pendingSettlement.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {ev.orderNumber} · {ev.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground">{ev.message}</p>
                </div>
                <Can permission="courier.manage">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={settlingId === ev.orderId}
                    onClick={() => void handleSettle(ev.orderId, ev.orderNumber)}
                  >
                    {settlingId === ev.orderId ? 'Saving…' : 'Mark paid'}
                  </Button>
                </Can>
              </div>
            ))}
            {!loading && pendingSettlement.length === 0 ? (
              <p className="text-sm text-muted-foreground">No COD collections pending settlement.</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/dashboard/orders/tools/send-courier-barcode">
              <Package className="size-4" />
              Barcode tool
            </Link>
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/dashboard/orders">
              <CheckCircle2 className="size-4" />
              All orders
            </Link>
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/dashboard/orders/failed">
              <XCircle className="size-4" />
              Failed orders
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
