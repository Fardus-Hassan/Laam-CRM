'use client';

import Link from 'next/link';
import type { OrderListRow } from '@laam/types';
import { MessageCircle, MessageSquare, MessageSquarePlus, Phone } from 'lucide-react';
import { toast } from 'sonner';

import {
  DataTableCopyableText,
  DataTableCourierStats,
  DataTableEmployeeCell,
  DataTableEmptyValue,
  DataTableMoneySummary,
  DataTablePersonCell,
  DataTableProductList,
  LabeledSection,
  TruncatedText,
} from '@/components/data-table/cells';
import type { CrmRowContext } from '@/components/data-table';
import { crmRowSerialNumber } from '@/components/data-table/use-crm-data-table';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { FormPhoneInput } from '@/components/form/form-phone-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { OrderDateStack } from '@/features/orders/components/order-list/order-date-stack';
import { OrderAgeBadge } from '@/features/orders/components/shared/order-age-badge';
import { OrderFollowUpControl } from '@/features/orders/components/shared/order-follow-up-control';
import { cn } from '@/lib/utils';
type OrderTableMobileCardProps = {
  row: OrderListRow;
  ctx: CrmRowContext<OrderListRow>;
  onNoteClick?: (row: OrderListRow) => void;
  onFollowUpSaved?: (orderId: string, followUpDueAt: string) => void;
};

export function OrderTableMobileCard({
  row,
  ctx,
  onNoteClick,
  onFollowUpSaved,
}: OrderTableMobileCardProps) {
  const displayId = row.orderNumber.replace(/^ORD-/, '');
  const phoneDigits = row.customerPhone.replace(/\D/g, '');
  const submitFailed = Boolean(row.courierSubmitFailed);

  return (
    <div
      className={cn(
        'divide-y divide-border/60',
        submitFailed &&
          'rounded-md border border-[color-mix(in_oklab,var(--brand-accent,#E8B931)_45%,transparent)] bg-[color-mix(in_oklab,var(--brand-accent,#E8B931)_12%,var(--card))]',
      )}
      title={
        submitFailed
          ? row.courierSubmitError
            ? `Courier submit failed: ${row.courierSubmitError}`
            : 'Courier submit failed'
          : undefined
      }
    >
      <header className="flex items-start gap-3 p-4">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <Checkbox
            checked={ctx.isSelected}
            onCheckedChange={(value) => ctx.toggleSelected(Boolean(value))}
            aria-label={`Select order ${row.orderNumber}`}
          />
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {crmRowSerialNumber(
              ctx.row.index,
              ctx.table.getState().pagination.pageIndex,
              ctx.table.getState().pagination.pageSize,
            )}
          </span>
        </div>
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
            compact
            name={row.customerName}
            sourceLabel={ORDER_SOURCE_LABELS[row.source]}
            phoneSlot={
              <div className="flex flex-wrap items-center gap-1">
                <FormPhoneInput
                  value={row.customerPhone}
                  readOnly
                  layout="inline"
                  className="pointer-events-auto h-8"
                />
                <OrderFollowUpControl
                  orderId={row.id}
                  orderNumber={row.orderNumber}
                  followUpDueAt={row.followUpDueAt}
                  followUpSetAt={row.followUpSetAt}
                  onSaved={(followUpDueAt) => onFollowUpSaved?.(row.id, followUpDueAt)}
                />
              </div>
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

        {row.courier || row.courierShop ? (
          <LabeledSection title="Courier">
            <DataTableCourierStats
              shop={row.courierShop}
              network={row.courier}
              compact
              meta={[
                row.courierProvider === 'pathao'
                  ? 'Pathao'
                  : row.courierProvider === 'carrybee'
                    ? 'Carrybee'
                    : row.courierProvider,
                row.courierStatus,
                row.courierConsignmentId,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          </LabeledSection>
        ) : row.courierProvider || row.courierStatus || row.courierConsignmentId ? (
          <LabeledSection title="Courier">
            <div className="space-y-0.5 text-sm leading-snug">
              <p className="font-semibold capitalize">
                {row.courierProvider === 'pathao' ? 'Pathao' : row.courierProvider || 'Courier'}
              </p>
              {row.courierStatus ? (
                <p className="text-muted-foreground">{row.courierStatus}</p>
              ) : null}
              {row.courierConsignmentId ? (
                <p className="font-mono text-xs text-muted-foreground">{row.courierConsignmentId}</p>
              ) : null}
            </div>
          </LabeledSection>
        ) : null}

        <LabeledSection title="Dates">
          <OrderDateStack row={row} />
        </LabeledSection>

        <LabeledSection title="Employee">
          {row.assignedAgentName ? (
            <DataTableCopyableText
              copyValue={row.assignedAgentName}
              copyToastMessage="Employee copied"
            >
              <DataTableEmployeeCell label={row.assignedAgentName} />
            </DataTableCopyableText>
          ) : (
            <DataTableEmptyValue />
          )}
        </LabeledSection>

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
