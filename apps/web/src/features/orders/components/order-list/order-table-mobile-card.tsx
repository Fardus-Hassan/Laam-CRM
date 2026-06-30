'use client';

import Link from 'next/link';
import type { OrderListRow } from '@laam/types';
import { MessageSquare, MessageSquarePlus } from 'lucide-react';

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

export function OrderTableMobileCard(row: OrderListRow, ctx: CrmRowContext<OrderListRow>) {
  const displayId = row.orderNumber.replace(/^ORD-/, '');

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
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={row.hasNote ? 'text-primary' : 'text-muted-foreground'}
          >
            {row.hasNote ? (
              <MessageSquare className="size-4" />
            ) : (
              <MessageSquarePlus className="size-4" />
            )}
            {row.hasNote ? 'View note' : 'Add note'}
          </Button>
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
