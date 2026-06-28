'use client';

import Link from 'next/link';
import type { OrderDetail } from '@laam/types';
import {
  ArrowLeft,
  MapPin,
  Package,
  Phone,
  StickyNote,
  UserRound,
} from 'lucide-react';

import { Can } from '@/components/auth/can';
import { DataTable, type DataTableColumn } from '@/components/dashboard/data-table';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { formatCurrency } from '@/lib/format';

type OrderDetailViewProps = {
  order: OrderDetail;
};

const LINE_ITEM_COLUMNS: DataTableColumn<OrderDetail['lineItems'][number]>[] = [
  {
    id: 'product',
    header: 'Product',
    cell: (row) => (
      <div>
        <p className="font-medium">{row.productName}</p>
        {row.sku ? <p className="text-xs text-muted-foreground">{row.sku}</p> : null}
      </div>
    ),
  },
  {
    id: 'qty',
    header: 'Qty',
    cell: (row) => row.quantity,
  },
  {
    id: 'unit',
    header: 'Unit price',
    cell: (row) => formatCurrency(row.unitPrice),
  },
  {
    id: 'total',
    header: 'Line total',
    cell: (row) => formatCurrency(row.lineTotal),
  },
];

export function OrderDetailView({ order }: OrderDetailViewProps) {
  return (
    <PageShell
      title={order.orderNumber}
      description={`${order.customerName} · ${ORDER_SOURCE_LABELS[order.source]}`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/orders">
              <ArrowLeft className="size-4" />
              Back to orders
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} kind="order" />
            <Can permission="orders.confirm">
              <Button type="button" size="sm" disabled={order.status !== 'pending'}>
                Confirm
              </Button>
            </Can>
            <Can permission="orders.cancel">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={order.status === 'delivered'}
              >
                Cancel
              </Button>
            </Can>
            <Can permission="orders.assign">
              <Button type="button" size="sm" variant="secondary">
                Assign agent
              </Button>
            </Can>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="gap-0 py-0 shadow-none lg:col-span-2">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="size-4 text-primary" />
                Order items
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 py-3 sm:px-4">
              <DataTable
                columns={LINE_ITEM_COLUMNS}
                rows={order.lineItems}
                getRowId={(row) => row.id}
              />
              <div className="mt-4 space-y-2 border-t border-border/70 pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{formatCurrency(order.deliveryCharge)}</span>
                </div>
                {order.discount ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(order.amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className="border-b px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <UserRound className="size-4 text-primary" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 text-sm">
                <div>
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-muted-foreground">{order.customerPhone}</p>
                  {order.customerEmail ? (
                    <p className="text-muted-foreground">{order.customerEmail}</p>
                  ) : null}
                </div>
                <Button type="button" variant="outline" size="sm" className="w-full">
                  <Phone className="size-4" />
                  Call customer
                </Button>
              </CardContent>
            </Card>

            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className="border-b px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MapPin className="size-4 text-primary" />
                  Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 text-sm">
                <p>{order.shippingAddress}</p>
                <p className="text-muted-foreground">Area: {order.shippingArea}</p>
                <p className="text-muted-foreground">
                  Payment: {order.paymentStatus.toUpperCase()}
                </p>
                <p className="text-muted-foreground">
                  Agent: {order.assignedAgentName ?? 'Unassigned'}
                </p>
              </CardContent>
            </Card>

            {order.notes ? (
              <Card className="gap-0 py-0 shadow-none">
                <CardHeader className="border-b px-4 py-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <StickyNote className="size-4 text-primary" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  {order.notes}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-sm">Activity timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ol className="space-y-4">
              {order.timeline.map((event) => (
                <li key={event.id} className="flex gap-3 text-sm">
                  <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium">{event.label}</p>
                    {event.description ? (
                      <p className="text-muted-foreground">{event.description}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(event.timestamp))}
                      {event.actorName ? ` · ${event.actorName}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
