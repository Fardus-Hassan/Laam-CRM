'use client';

import * as React from 'react';
import Link from 'next/link';
import type { CourierOverview, CourierProvider } from '@laam/types';
import { CheckCircle2, Package, RefreshCw, Send, Truck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatCurrency } from '@/lib/format';
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

export function CourierHubPage() {
  const [data, setData] = React.useState<CourierOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);
  const [settlingId, setSettlingId] = React.useState<string | null>(null);
  const [submitProvider, setSubmitProvider] = React.useState<CourierProvider>('pathao');

  const refresh = React.useCallback(async () => {
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

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      await refresh();
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
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Settlement failed');
    } finally {
      setSettlingId(null);
    }
  }

  const pendingSettlement =
    data?.inbox.filter((e) => e.type === 'delivered') ?? [];

  return (
    <PageShell
      title="Courier Hub"
      description="Courier accounts, bulk submit, and live tracking inbox."
    >
      <div className={ORDER_PAGE_GAP}>
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
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
                      {new Date(ev.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
            className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between')}
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
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.readyToSubmit.map((row) => (
                  <TableRow key={row.orderId}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(row.orderId)}
                        onChange={() => toggle(row.orderId)}
                        className="size-4"
                      />
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
                {!loading && data && data.readyToSubmit.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No orders ready. Confirm an order (with address) to queue it here for bulk
                      Pathao/Carrybee submit.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
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
