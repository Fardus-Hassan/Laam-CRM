'use client';

import * as React from 'react';
import Link from 'next/link';
import type { CustomerDetail } from '@laam/types';
import {
  ArrowLeft,
  Copy,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  ShoppingBag,
  StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';

import { StatusBadge } from '@/components/dashboard/status-badge';
import { PageShell } from '@/components/layout/page-shell';
import { FormField } from '@/components/form/form-field';
import { FormTextarea } from '@/components/form/form-textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { siteConfig } from '@/config/site';
import { CompactPager } from '@/components/ui/compact-pager';
import { CustomerCourierNetworkPanel } from '@/features/customers/components/customer-courier-network-panel';
import {
  ORDER_DETAIL_SIDEBAR_GRID_CLASS,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
  ORDER_STICKY_TOP_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { EditableSectionCard } from '@/features/orders/components/shared/editable-section-card';
import { ordersApi } from '@/features/orders/api/orders-api';
import { CustomerTimeline } from '@/features/customers/components/customer-timeline';
import { CustomerFollowUpControl } from '@/features/customers/components/shared/customer-follow-up-control';
import { CustomerStatusBadge } from '@/features/customers/components/shared/customer-status-badge';
import { CustomerStatusDialog } from '@/features/customers/components/shared/customer-status-dialog';
import { formatCustomerDate } from '@/features/customers/components/customer-list/customer-table-columns';
import { useCustomerDetailMutations } from '@/features/customers/hooks/use-customer-mutations';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const CARD = 'gap-0 py-0 shadow-none';
const ORDERS_PAGE_SIZE = 6;
const PRODUCTS_PAGE_SIZE = 6;

type CustomerDetailViewProps = {
  customer: CustomerDetail;
  onCustomerUpdated?: (customer: CustomerDetail) => void;
};

/**
 * Customer workspace: scannable layout (not tiny type).
 * First view = who + how to reach + orders health + follow-up — clearly grouped.
 */
export function CustomerDetailView({
  customer: initial,
  onCustomerUpdated,
}: CustomerDetailViewProps) {
  const [customer, setCustomer] = React.useState(initial);
  const [notesDraft, setNotesDraft] = React.useState(initial.notes ?? '');
  const [statusOpen, setStatusOpen] = React.useState(false);

  const handleUpdated = React.useCallback(
    (updated: CustomerDetail) => {
      setCustomer(updated);
      setNotesDraft(updated.notes ?? '');
      onCustomerUpdated?.(updated);
    },
    [onCustomerUpdated],
  );

  const { saveNotes, changeStatus } = useCustomerDetailMutations(customer.id, (updated) => {
    if (updated) handleUpdated(updated);
  });

  React.useEffect(() => {
    setCustomer(initial);
    setNotesDraft(initial.notes ?? '');
  }, [initial]);

  const phoneDigits = customer.phone.replace(/\D/g, '');
  const successRate = customer.courierScore?.rate;
  const newOrderHref = `/dashboard/orders/new?phone=${encodeURIComponent(customer.phone)}`;

  return (
    <PageShell
      title={customer.name}
      description={`Customer ${customer.customerNumber}`}
      breadcrumbs={[
        { label: 'Dashboard', href: siteConfig.dashboardRoute },
        { label: 'Customers', href: '/dashboard/customers' },
        { label: customer.customerNumber },
      ]}
    >
      <div className="space-y-3">
        {/* Actions — labelled, easy to hit */}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/customers">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Button type="button" size="sm" asChild>
            <Link href={newOrderHref}>
              <ShoppingBag className="size-4" />
              New order
            </Link>
          </Button>
          <span className="hidden h-5 w-px bg-border sm:block" />
          <Button type="button" size="sm" variant="outline" asChild>
            <a href={`tel:${phoneDigits}`}>
              <Phone className="size-4" />
              Call
            </a>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => window.open(`sms:${customer.phone}`, '_self')}
          >
            <MessageSquare className="size-4" />
            SMS
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              window.open(`https://wa.me/${phoneDigits}`, '_blank', 'noopener,noreferrer')
            }
          >
            <MessageCircle className="size-4" />
            WhatsApp
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(customer.phone);
              toast.success('Phone copied');
            }}
          >
            <Copy className="size-4" />
            Copy
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <CustomerStatusBadge status={customer.status} label={customer.statusLabel} />
            <Button type="button" size="sm" variant="secondary" onClick={() => setStatusOpen(true)}>
              Change status
            </Button>
          </div>
        </div>

        {/* Profile strip — identity + snapshot in one glance */}
        <Card className={CARD}>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">{customer.name}</h2>
                  <CustomerStatusBadge status={customer.status} label={customer.statusLabel} />
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">ID {customer.customerNumber}</span>
                  {customer.assignedAgentName ? (
                    <> · Agent {customer.assignedAgentName}</>
                  ) : (
                    <> · Unassigned</>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Joined {formatCustomerDate(customer.createdAt)}
                  {customer.lastOrderAt
                    ? ` · Last order ${formatCustomerDate(customer.lastOrderAt)}`
                    : ' · No orders yet'}
                </p>
              </div>

              <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label="Orders" value={String(customer.orderCount)} />
                <StatTile
                  label="Delivered"
                  value={String(customer.deliveredCount)}
                  tone="primary"
                />
                <StatTile label="Lifetime spend" value={formatCurrency(customer.totalSpent)} />
                <StatTile
                  label="Courier rate"
                  value={successRate != null ? `${Math.round(successRate)}%` : '—'}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className={cn('grid items-start gap-3', ORDER_DETAIL_SIDEBAR_GRID_CLASS)}>
          <div className="min-w-0 space-y-3 pb-10 xl:pb-0">
            {/* Contact — label/value grid, no wasted stretch */}
            <Card className={CARD}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm font-semibold">Contact & address</CardTitle>
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Mobile">
                    <span className="font-medium tabular-nums">{customer.phone}</span>
                  </Field>
                  <Field label="Email">{customer.email?.trim() || '—'}</Field>
                  <Field label="Area">{customer.area?.trim() || '—'}</Field>
                  <Field label="District">{customer.district?.trim() || '—'}</Field>
                  <Field label="Joined">{formatCustomerDate(customer.createdAt)}</Field>
                  <Field label="Address" className="sm:col-span-2 lg:col-span-3">
                    <span className="inline-flex items-start gap-1.5">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <span>{customer.address?.trim() || '—'}</span>
                    </span>
                  </Field>
                </dl>
              </CardContent>
            </Card>

            {/* Orders + activity side-by-side — core CRM scan */}
            <div className="grid gap-3 xl:grid-cols-2">
              <CustomerOrdersPanel phone={customer.phone} newOrderHref={newOrderHref} />
              <CustomerTimeline phone={customer.phone} activities={customer.activities} />
            </div>

            {/* Products + notes */}
            <div className="grid gap-3 lg:grid-cols-2">
              <ProductHistoryPanel products={customer.recentProducts} />
              <EditableSectionCard
                title="Notes"
                icon={<StickyNote className="size-4 text-primary" />}
                editContent={
                  <FormField label="Internal note">
                    <FormTextarea
                      rows={4}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                    />
                  </FormField>
                }
                onSave={async () => {
                  await saveNotes(notesDraft);
                }}
                onCancel={() => setNotesDraft(customer.notes ?? '')}
              >
                {customer.notes ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {customer.notes}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No internal notes yet.</p>
                )}
              </EditableSectionCard>
            </div>
          </div>

          {/* Right column — fills empty side; courier lives here */}
          <aside className="min-w-0 w-full self-start">
            <div
              className={cn(
                'flex w-full flex-col gap-3 xl:sticky xl:z-20',
                ORDER_STICKY_TOP_CLASS,
              )}
            >
              <CustomerFollowUpControl
                variant="panel"
                className="w-full"
                customerId={customer.id}
                customerName={customer.name}
                followUpDue={customer.followUpDue}
                hasFollowUp={customer.hasFollowUp}
                assignedAgentName={customer.assignedAgentName}
                onSaved={(followUpDue) => {
                  handleUpdated({
                    ...customer,
                    hasFollowUp: true,
                    followUpDue,
                  });
                  onCustomerUpdated?.({
                    ...customer,
                    hasFollowUp: true,
                    followUpDue,
                  });
                }}
              />

              <Card className={CARD}>
                <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                  <CardTitle className="text-sm font-semibold">Courier network</CardTitle>
                </CardHeader>
                <CardContent className={ORDER_SECTION_BODY_CLASS}>
                  <CustomerCourierNetworkPanel
                    phone={customer.phone}
                    shopOrders={customer.orderCount}
                    shopDelivered={customer.deliveredCount}
                  />
                </CardContent>
              </Card>

              <Card className={CARD}>
                <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                  <CardTitle className="text-sm font-semibold">Tags</CardTitle>
                </CardHeader>
                <CardContent className={ORDER_SECTION_BODY_CLASS}>
                  {customer.tags.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {customer.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags</p>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2">
                <Button type="button" size="sm" variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/dashboard/orders?search=${encodeURIComponent(customer.phone)}`}>
                    All orders for this phone
                  </Link>
                </Button>
                <Button type="button" size="sm" variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/dashboard/followups?search=${encodeURIComponent(customer.phone)}`}>
                    Open follow-ups queue
                  </Link>
                </Button>
                <Button type="button" size="sm" className="w-full justify-start" asChild>
                  <Link href={newOrderHref}>
                    <ShoppingBag className="size-4" />
                    Place new order
                  </Link>
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <CustomerStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        customerName={customer.name}
        currentStatus={customer.status}
        onSelect={changeStatus}
      />
    </PageShell>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'primary';
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border/70 bg-muted/25 px-3 py-2',
        tone === 'primary' && 'border-primary/25 bg-primary/5',
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-base font-semibold tabular-nums',
          tone === 'primary' && 'text-primary',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function CustomerOrdersPanel({
  phone,
  newOrderHref,
}: {
  phone: string;
  newOrderHref: string;
}) {
  const [orders, setOrders] = React.useState<
    Awaited<ReturnType<typeof ordersApi.getOrdersByPhone>>
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(1);
    void ordersApi
      .getOrdersByPhone(phone)
      .then((items) => {
        if (!cancelled) setOrders(items);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [phone]);

  const totalPages = Math.max(1, Math.ceil(orders.length / ORDERS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageOrders = orders.slice(
    (safePage - 1) * ORDERS_PAGE_SIZE,
    safePage * ORDERS_PAGE_SIZE,
  );

  return (
    <Card className={CARD}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            Orders
            {!loading ? (
              <Badge variant="secondary" className="font-normal tabular-nums">
                {orders.length}
              </Badge>
            ) : null}
          </CardTitle>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href={newOrderHref}>New</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className={cn('space-y-2', ORDER_SECTION_BODY_CLASS)}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-dashed px-3 py-5 text-center">
            <p className="text-sm text-muted-foreground">No orders for this number yet.</p>
            <Button type="button" size="sm" className="mt-3" asChild>
              <Link href={newOrderHref}>Create first order</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-border/70">
              <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-2 border-b border-border/60 bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Order</span>
                <span>Date</span>
                <span className="text-right">Amount</span>
              </div>
              <ul className="divide-y divide-border/50">
                {pageOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/dashboard/orders/${order.orderNumber}`}
                      className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
                    >
                      <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <span className="truncate font-semibold tabular-nums text-primary">
                          {order.orderNumber}
                        </span>
                        <StatusBadge status={order.status} kind="order" className="w-fit shrink-0" />
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground sm:text-sm">
                        {formatDateTime(order.createdAt)}
                      </span>
                      <span className="text-right font-semibold tabular-nums">
                        {formatCurrency(order.amount)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {orders.length > ORDERS_PAGE_SIZE ? (
              <CompactPager
                page={safePage}
                totalPages={totalPages}
                totalItems={orders.length}
                pageSize={ORDERS_PAGE_SIZE}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProductHistoryPanel({
  products,
}: {
  products: CustomerDetail['recentProducts'];
}) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = products.slice(
    (safePage - 1) * PRODUCTS_PAGE_SIZE,
    safePage * PRODUCTS_PAGE_SIZE,
  );

  React.useEffect(() => {
    setPage(1);
  }, [products]);

  return (
    <Card className={CARD}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          Product history
          {products.length > 0 ? (
            <Badge variant="secondary" className="font-normal tabular-nums">
              {products.length}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('space-y-2', ORDER_SECTION_BODY_CLASS)}>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products ordered yet.</p>
        ) : (
          <>
            <ul className="divide-y divide-border/60">
              {pageItems.map((product, index) => (
                <li
                  key={`${product.productName}-${(safePage - 1) * PRODUCTS_PAGE_SIZE + index}`}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <p className="min-w-0 text-sm font-medium leading-snug">{product.productName}</p>
                  <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatCustomerDate(product.orderedAt)}
                    {product.quantity ? ` · Qty ${product.quantity}` : ''}
                  </p>
                </li>
              ))}
            </ul>
            {products.length > PRODUCTS_PAGE_SIZE ? (
              <CompactPager
                page={safePage}
                totalPages={totalPages}
                totalItems={products.length}
                pageSize={PRODUCTS_PAGE_SIZE}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
