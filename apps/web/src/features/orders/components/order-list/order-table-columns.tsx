'use client';

import { MessageSquare, MessageSquarePlus } from 'lucide-react';
import type { OrderListRow } from '@laam/types';

import type { CrmColumnDef } from '@/components/data-table';
import {
  DataTableCourierStats,
  DataTableCopyableText,
  DataTableEmployeeCell,
  DataTableEmptyValue,
  DataTableMoneySummary,
  DataTablePersonCell,
  DataTableProductList,
  TruncatedText,
} from '@/components/data-table/cells';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { FormPhoneInput } from '@/components/form/form-phone-input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { OrderDateStack } from '@/features/orders/components/order-list/order-date-stack';

export { formatOrderDateTime } from '@/features/orders/components/order-list/order-date-stack';

export function buildOrderTableColumns(options?: {
  onNoteClick?: (row: OrderListRow) => void;
}): CrmColumnDef<OrderListRow>[] {
  const onNoteClick = options?.onNoteClick;
  return [
  {
    id: 'status',
    header: 'Status',
    enableSorting: true,
    size: 108,
    minSize: 96,
    meta: {
      label: 'Status',
      priority: 'primary',
      headerClassName: 'min-w-[96px] text-center',
      cellClassName: 'min-w-[96px]',
      align: 'center',
    },
    cell: ({ row }) => (
      <div className="mx-auto flex w-full flex-col items-center justify-center gap-1 text-center">
        <StatusBadge status={row.original.status} kind="order" />
        {row.original.serialNumber ? (
          <p className="text-[10px] tabular-nums text-muted-foreground">
            st {row.original.serialNumber}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    id: 'notes',
    header: 'Notes',
    size: 52,
    minSize: 48,
    maxSize: 52,
    meta: {
      label: 'Notes',
      priority: 'secondary',
      headerClassName: 'w-12 text-center',
      cellClassName: 'w-12 text-center',
      align: 'middle',
    },
    cell: ({ row }) => (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={
                row.original.hasNote ? 'size-8 text-primary' : 'size-8 text-muted-foreground'
              }
              aria-label={row.original.hasNote ? 'View note' : 'Add note'}
              onClick={() => onNoteClick?.(row.original)}
            >
              {row.original.hasNote ? (
                <MessageSquare className="size-4" />
              ) : (
                <MessageSquarePlus className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[220px]">
            {row.original.lastNotePreview?.trim()
              ? row.original.lastNotePreview
              : row.original.hasNote
                ? 'Open to view note history'
                : 'Add note'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },
  {
    id: 'products',
    header: 'ID & Products',
    size: 200,
    minSize: 180,
    // No maxSize — absorbs leftover width on large screens.
    meta: {
      label: 'ID & Products',
      priority: 'primary',
      headerClassName: 'min-w-[180px]',
      cellClassName: 'min-w-[180px]',
      align: 'top',
    },
    cell: ({ row }) => (
      <DataTableProductList
        orderNumber={row.original.orderNumber}
        orderHref={`/dashboard/orders/${row.original.orderNumber}`}
        products={row.original.products}
        maxItems={2}
        compact
      />
    ),
  },
  {
    id: 'customer',
    header: 'Name & Number',
    enableSorting: true,
    // Fixed to phone + 4 actions (does not stretch on large screens).
    size: 268,
    minSize: 268,
    maxSize: 268,
    meta: {
      label: 'Customer',
      priority: 'primary',
      headerClassName: 'w-[268px]',
      cellClassName: 'w-[268px] overflow-hidden',
      align: 'top',
    },
    cell: ({ row }) => (
      <DataTablePersonCell
        compact
        className="w-max max-w-full"
        name={row.original.customerName}
        sourceLabel={ORDER_SOURCE_LABELS[row.original.source]}
        phoneSlot={
          <FormPhoneInput
            value={row.original.customerPhone}
            readOnly
            layout="inline"
            showCopy
            showSms
            showCall
            showWhatsapp
            className="pointer-events-auto h-8"
          />
        }
      />
    ),
  },
  {
    id: 'date',
    header: 'Date',
    enableSorting: true,
    size: 178,
    minSize: 178,
    maxSize: 178,
    meta: {
      label: 'Dates',
      priority: 'secondary',
      headerClassName: 'w-[178px]',
      cellClassName: 'w-[178px] whitespace-nowrap overflow-hidden',
      align: 'top',
    },
    cell: ({ row }) => <OrderDateStack row={row.original} />,
  },
  {
    id: 'address',
    header: 'Address',
    size: 220,
    minSize: 180,
    // Flexible — takes most extra space on large monitors.
    meta: {
      label: 'Address',
      priority: 'hidden-mobile',
      headerClassName: 'min-w-[180px]',
      cellClassName: 'min-w-[180px]',
      align: 'top',
    },
    cell: ({ row }) => (
      <DataTableCopyableText
        copyValue={row.original.shippingAddress}
        copyToastMessage="Address copied"
      >
        <TruncatedText className="text-xs leading-relaxed text-muted-foreground" lines={3}>
          {row.original.shippingAddress}
        </TruncatedText>
      </DataTableCopyableText>
    ),
  },
  {
    id: 'employee',
    header: 'Employee',
    size: 148,
    minSize: 130,
    // Flexible so full name fits without overlapping the copy icon.
    meta: {
      label: 'Employee',
      priority: 'secondary',
      headerClassName: 'min-w-[130px]',
      cellClassName: 'min-w-[130px] overflow-hidden whitespace-normal',
      align: 'top',
    },
    cell: ({ row }) =>
      row.original.assignedAgentName ? (
        <DataTableCopyableText
          copyValue={row.original.assignedAgentName}
          copyToastMessage="Employee copied"
        >
          <DataTableEmployeeCell label={row.original.assignedAgentName} />
        </DataTableCopyableText>
      ) : (
        <DataTableEmptyValue />
      ),
  },
  {
    id: 'summary',
    header: 'Summary',
    size: 124,
    minSize: 124,
    maxSize: 124,
    meta: {
      label: 'Summary',
      priority: 'primary',
      headerClassName: 'w-[124px]',
      cellClassName: 'w-[124px]',
      align: 'middle',
    },
    cell: ({ row }) => (
      <DataTableMoneySummary
        subtotal={row.original.subtotal}
        discount={row.original.discount}
        paid={row.original.paid}
        due={row.original.due}
      />
    ),
  },
  {
    id: 'courier',
    header: 'Success Rate',
    size: 190,
    minSize: 170,
    // Flexible on wide screens.
    meta: {
      label: 'Success Rate',
      priority: 'primary',
      headerClassName: 'min-w-[170px]',
      cellClassName: 'min-w-[170px]',
      align: 'middle',
    },
    cell: ({ row }) => {
      const stats = row.original.courier;
      const provider = row.original.courierProvider;
      const status = row.original.courierStatus;
      const consignment = row.original.courierConsignmentId;
      const providerLabel =
        provider === 'pathao' ? 'Pathao' : provider === 'carrybee' ? 'Carrybee' : provider;
      const meta = [providerLabel, status, consignment].filter(Boolean).join(' · ');

      if (stats) {
        return (
          <DataTableCourierStats
            shop={row.original.courierShop}
            network={stats}
            compact
            meta={meta || undefined}
          />
        );
      }

      if (provider || status || consignment) {
        return (
          <div className="min-w-0 space-y-0.5 text-[11px] leading-snug">
            <p className="truncate font-semibold capitalize text-foreground">
              {providerLabel || 'Courier'}
            </p>
            {status ? (
              <p className="line-clamp-2 text-muted-foreground">{status}</p>
            ) : null}
            {consignment ? (
              <p className="truncate font-mono text-[10px] text-muted-foreground">{consignment}</p>
            ) : null}
          </div>
        );
      }
      return <DataTableEmptyValue />;
    },
  },
];
}

export const ORDER_TABLE_COLUMNS = buildOrderTableColumns();

export const ORDER_TABLE_PINNED = {
  left: ['status'],
};
