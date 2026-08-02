'use client';

import * as React from 'react';
import Link from 'next/link';
import type { CustomerDetail } from '@laam/types';
import { ArrowLeft, MapPin, Phone, ShoppingBag, StickyNote } from 'lucide-react';

import { PageShell } from '@/components/layout/page-shell';
import { FormField } from '@/components/form/form-field';
import { FormTextarea } from '@/components/form/form-textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
  ORDER_SIDEBAR_GRID_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { EditableSectionCard } from '@/features/orders/components/shared/editable-section-card';
import { CourierPhoneHistoryPanel } from '@/features/courier/components/courier-phone-history-panel';
import { CustomerTimeline } from '@/features/customers/components/customer-timeline';
import { CustomerStatusBadge } from '@/features/customers/components/shared/customer-status-badge';
import { CustomerStatusDialog } from '@/features/customers/components/shared/customer-status-dialog';
import { useCustomerDetailMutations } from '@/features/customers/hooks/use-customer-mutations';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { formatCustomerDate } from '@/features/customers/components/customer-list/customer-table-columns';

type CustomerDetailViewProps = {
  customer: CustomerDetail;
  onCustomerUpdated?: (customer: CustomerDetail) => void;
};

export function CustomerDetailView({ customer: initial, onCustomerUpdated }: CustomerDetailViewProps) {
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

  return (
    <PageShell title={customer.name} description={`${customer.phone} · ${customer.district ?? 'Dhaka'}`}>
      <div className={cn(ORDER_PAGE_GAP)}>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/customers">
              <ArrowLeft className="size-4" />
              Back to customers
            </Link>
          </Button>
          <Button type="button" size="sm" asChild>
            <Link href={`/dashboard/orders/new?phone=${encodeURIComponent(customer.phone)}`}>
              <ShoppingBag className="size-4" />
              New order
            </Link>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setStatusOpen(true)}>
            Change status
          </Button>
        </div>

        <div className="rounded-xl border bg-gradient-to-br from-muted/40 to-muted/10 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{customer.name}</h2>
                <CustomerStatusBadge status={customer.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                ID {customer.customerNumber} · Joined {formatCustomerDate(customer.createdAt)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" asChild>
                  <a href={`tel:${phoneDigits}`}>
                    <Phone className="size-3.5" />
                    Call
                  </a>
                </Button>
              </div>
            </div>
            <div className="grid min-w-[200px] grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Orders</p>
                <p className="font-semibold tabular-nums">{customer.orderCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="font-semibold tabular-nums">{customer.deliveredCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total spent</p>
                <p className="font-semibold tabular-nums">{formatCurrency(customer.totalSpent)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agent</p>
                <p className="font-semibold">{customer.assignedAgentName ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className={cn('grid gap-4', ORDER_SIDEBAR_GRID_CLASS)}>
          <div className="space-y-4">
            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Contact & address</CardTitle>
              </CardHeader>
              <CardContent className={cn('grid gap-4 sm:grid-cols-2', ORDER_SECTION_BODY_CLASS)}>
                <InfoRow label="Mobile" value={customer.phone} />
                <InfoRow label="Email" value={customer.email ?? '—'} />
                <InfoRow label="Area" value={customer.area ?? '—'} />
                <InfoRow label="District" value={customer.district ?? '—'} />
                <InfoRow
                  label="Address"
                  value={customer.address ?? '—'}
                  icon={MapPin}
                  className="sm:col-span-2"
                />
              </CardContent>
            </Card>

            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Product history</CardTitle>
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                {customer.recentProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {customer.recentProducts.map((product, index) => (
                      <li key={`${product.productName}-${index}`} className="rounded-lg border px-3 py-2">
                        <p className="font-medium">{product.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCustomerDate(product.orderedAt)}
                          {product.quantity ? ` · Qty ${product.quantity}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Courier score</CardTitle>
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                <CourierPhoneHistoryPanel phone={customer.phone} />
              </CardContent>
            </Card>

            <Card className="gap-0 py-0 shadow-none">
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Tags</CardTitle>
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                {customer.tags.length ? (
                  <div className="flex flex-wrap gap-2">
                    {customer.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags</p>
                )}
              </CardContent>
            </Card>

            <EditableSectionCard
              title="Notes"
              icon={<StickyNote className="size-4 text-primary" />}
              editContent={
                <FormField label="Internal note">
                  <FormTextarea
                    rows={5}
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
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{customer.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No internal notes yet.</p>
              )}
            </EditableSectionCard>

            <CustomerTimeline phone={customer.phone} activities={customer.activities} />
          </div>
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

function InfoRow({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 font-medium">
        {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
        {value}
      </p>
    </div>
  );
}
