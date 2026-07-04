'use client';

import * as React from 'react';
import Link from 'next/link';
import type { CourierOverview } from '@laam/types';
import { CheckCircle2, Package, RefreshCw, Send, Truck, XCircle } from 'lucide-react';

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
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const overview = await courierApi.getOverview();
    setData(overview);
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

  async function handleSubmit() {
    if (!selected.size || !data) return;
    setSubmitting(true);
    try {
      await courierApi.submitOrders([...selected], data.rules.defaultProvider);
      setSelected(new Set());
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Courier Hub"
      description="Courier accounts, bulk submit, and live tracking inbox."
    >
      <div className={ORDER_PAGE_GAP}>
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>

        <CrmSummaryStrip
          items={[
            { id: 'sub', label: 'Submitted today', value: data ? String(data.stats.submittedToday) : '—' },
            { id: 'transit', label: 'In transit', value: data ? String(data.stats.inTransit) : '—' },
            { id: 'del', label: 'Delivered today', value: data ? String(data.stats.deliveredToday) : '—' },
            { id: 'fail', label: 'Failed today', value: data ? String(data.stats.failedToday) : '—' },
          ]}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Courier accounts</CardTitle>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
              {data?.accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Truck className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {acc.label}
                        {acc.isDefault ? (
                          <Badge variant="secondary" className="ml-2 text-[10px]">Default</Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {acc.consignmentsToday} today · {acc.successRate}% success
                      </p>
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[acc.status]}>{acc.status}</Badge>
                </div>
              ))}
              {data ? (
                <p className="text-xs text-muted-foreground">
                  Default: {data.rules.defaultProvider} · COD {data.rules.codEnabled ? `on (${data.rules.codChargePercent}%)` : 'off'}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Tracking inbox</CardTitle>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'max-h-80 space-y-2 overflow-y-auto')}>
              {data?.inbox.map((ev) => (
                <div
                  key={ev.id}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm',
                    !ev.isRead && 'border-primary/30 bg-primary/5',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px]">{EVENT_LABELS[ev.type]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-1 font-medium">
                    <Link href={`/dashboard/orders/${ev.orderId}`} className="hover:underline">
                      {ev.orderNumber}
                    </Link>
                    {' · '}{ev.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground">{ev.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className={ORDER_CARD_CLASS}>
          <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between')}>
            <CardTitle className="text-sm">Ready to submit</CardTitle>
            <Can permission="courier.manage">
              <Button
                type="button"
                size="sm"
                disabled={!selected.size || submitting}
                onClick={() => void handleSubmit()}
              >
                <Send className="size-4" />
                {submitting ? 'Submitting…' : `Submit ${selected.size || ''}`.trim()}
              </Button>
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
                      <Link href={`/dashboard/orders/${row.orderId}`} className="hover:underline">
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
              Cash-in only: sales already posted on deliver. Settlement clears COD receivables.
            </p>
            {(data?.inbox.filter((e) => e.type === 'cod_collected') ?? []).map((ev) => (
              <div key={ev.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{ev.orderNumber} · {ev.customerName}</p>
                  <p className="text-xs text-muted-foreground">{ev.message}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void import('@/features/orders/data/mock-orders').then(({ updateMockOrder, getOrderStore }) => {
                      const order = getOrderStore().find(
                        (o) => o.id === ev.orderId || o.orderNumber === ev.orderNumber,
                      );
                      if (order) {
                        updateMockOrder(order.id, { paymentStatus: 'paid', status: order.status });
                      }
                      void import('sonner').then(({ toast }) =>
                        toast.success(`Settled ${ev.orderNumber}`),
                      );
                      void refresh();
                    });
                  }}
                >
                  Mark paid
                </Button>
              </div>
            ))}
            {!data?.inbox.some((e) => e.type === 'cod_collected') ? (
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
