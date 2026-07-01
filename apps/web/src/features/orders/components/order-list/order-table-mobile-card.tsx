'use client';

import Link from 'next/link';
import type { OrderListRow } from '@laam/types';
import { MessageCircle, MessageSquare, MessageSquarePlus, Phone } from 'lucide-react';
import { toast } from 'sonner';

import {
  DataTableCopyableText,
  DataTableCourierStats,
  DataTableDateTime,
  DataTableEmptyValue,
  DataTableMoneySummary,
  DataTablePersonCell,
  DataTableProductList,
  LabeledSection,
  TruncatedText,
} from '@/components/data-table/cells';
import type { CrmRowContext } from '@/components/data-table';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { FormPhoneInput } from '@/components/form/form-phone-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { formatOrderDateTime } from '@/features/orders/components/order-list/order-table-columns';
import { OrderAgeBadge } from '@/features/orders/components/shared/order-age-badge';

type OrderTableMobileCardProps = {
  row: OrderListRow;
  ctx: CrmRowContext<OrderListRow>;
  onNoteClick?: (row: OrderListRow) => void;
};

export function OrderTableMobileCard({ row, ctx, onNoteClick }: OrderTableMobileCardProps) {
  const displayId = row.orderNumber.replace(/^ORD-/, '');
  const phoneDigits = row.customerPhone.replace(/\D/g, '');

  return (
    <div className="divide-y divide-border/60">
      <header className="flex items-start gap-3 p-4">
        <Checkbox
          checked={ctx.isSelected}
          onCheckedChange={(value) => ctx.toggleSelected(Boolean(value))}
          aria-label={`Select order ${row.orderNumber}`}
          className="mt-1"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={row.status} kind="order" />
            <OrderAgeBadge createdAt={row.createdAt} status={row.status} />
            <Link
              href={`/dashboard/orders/${row.orderNumber}`}
              className="text-base font-semibold text-primary hover:underline"
            >
              #{displayId}
            </Link>
            {row.serialNumber ? (
              <span className="text-[10px] text-muted-foreground">sl: {row.serialNumber}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="outline" className="h-7 px-2" asChild>
              <a href={`tel:${phoneDigits}`}>
                <Phone className="size-3.5" />
                Call
              </a>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => {
                window.open(`https://wa.me/${phoneDigits}`, '_blank', 'noopener,noreferrer');
              }}
            >
              <MessageCircle className="size-3.5" />
              WhatsApp
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={row.hasNote ? 'h-7 px-2 text-primary' : 'h-7 px-2 text-muted-foreground'}
              onClick={() => onNoteClick?.(row)}
            >
              {row.hasNote ? (
                <MessageSquare className="size-3.5" />
              ) : (
                <MessageSquarePlus className="size-3.5" />
              )}
              Note
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => {
                void navigator.clipboard.writeText(row.customerPhone);
                toast.success('Phone copied');
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      </header>

      <div className="space-y-4 p-4">
        <LabeledSection title="Customer">
          <DataTablePersonCell
            name={row.customerName}
            sourceLabel={ORDER_SOURCE_LABELS[row.source]}
            phoneSlot={
              <FormPhoneInput
                value={row.customerPhone}
                readOnly
                className="pointer-events-auto h-8 text-xs"
              />
            }
          />
        </LabeledSection>

        <LabeledSection title="Products">
          <DataTableProductList
            orderNumber={row.orderNumber}
            orderHref={`/dashboard/orders/${row.orderNumber}`}
            products={row.products}
          />
        </LabeledSection>

        <LabeledSection title="Summary">
          <DataTableMoneySummary
            subtotal={row.subtotal}
            discount={row.discount}
            paid={row.paid}
            due={row.due}
          />
        </LabeledSection>

        {row.courier ? (
          <LabeledSection title="Courier">
            <DataTableCourierStats courier={row.courier} />
          </LabeledSection>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledSection title="Created">
            <DataTableCopyableText
              copyValue={`C: ${formatOrderDateTime(row.createdAt)}`}
              copyToastMessage="Date copied"
            >
              <DataTableDateTime
                prefix="C:"
                value={row.createdAt}
                formatter={formatOrderDateTime}
              />
            </DataTableCopyableText>
          </LabeledSection>
          <LabeledSection title="Employee">
            {row.assignedAgentName ? (
              <DataTableCopyableText
                copyValue={row.assignedAgentName}
                copyToastMessage="Employee copied"
              >
                <p className="text-sm font-medium">{row.assignedAgentName}</p>
              </DataTableCopyableText>
            ) : (
              <DataTableEmptyValue />
            )}
          </LabeledSection>
        </div>

        <LabeledSection title="Address">
          <DataTableCopyableText copyValue={row.shippingAddress} copyToastMessage="Address copied">
            <TruncatedText className="text-sm leading-relaxed text-muted-foreground" lines={3}>
              {row.shippingAddress}
            </TruncatedText>
          </DataTableCopyableText>
        </LabeledSection>
      </div>
    </div>
  );
}
