'use client';

import { MessageSquare, MessageSquarePlus } from 'lucide-react';
import type { OrderListRow } from '@laam/types';

import type { CrmColumnDef } from '@/components/data-table';
import {
  DataTableCourierStats,
  DataTableCopyableText,
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
    size: 220,
    minSize: 200,
    maxSize: 260,
    meta: {
      label: 'ID & Products',
      priority: 'primary',
      headerClassName: 'w-[220px]',
      cellClassName: 'w-[220px]',
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
    size: 158,
    minSize: 148,
    meta: {
      label: 'Customer',
      priority: 'primary',
      headerClassName: 'min-w-[158px]',
      cellClassName: 'min-w-[158px]',
      align: 'top',
    },
    cell: ({ row }) => (
      <DataTablePersonCell
        name={row.original.customerName}
        sourceLabel={ORDER_SOURCE_LABELS[row.original.source]}
        phoneSlot={
          <FormPhoneInput
            value={row.original.customerPhone}
            readOnly
            layout="stacked"
            className="pointer-events-auto h-8 text-xs"
          />
        }
      />
    ),
  },
  {
    id: 'date',
    header: 'Date',
    enableSorting: true,
    size: 168,
    minSize: 150,
    meta: {
      label: 'Dates',
      priority: 'secondary',
      headerClassName: 'min-w-[160px]',
      cellClassName: 'min-w-[160px]',
      align: 'top',
    },
    cell: ({ row }) => <OrderDateStack row={row.original} />,
  },
  {
    id: 'address',
    header: 'Address',
    size: 200,
    minSize: 160,
    maxSize: 240,
    meta: {
      label: 'Address',
      priority: 'hidden-mobile',
      headerClassName: 'min-w-[220px]',
      cellClassName: 'min-w-[220px] max-w-[280px]',
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
    size: 120,
    minSize: 100,
    meta: {
      label: 'Employee',
      priority: 'secondary',
      headerClassName: 'min-w-[120px]',
      cellClassName: 'min-w-[120px]',
      align: 'top',
    },
    cell: ({ row }) =>
      row.original.assignedAgentName ? (
        <DataTableCopyableText
          copyValue={row.original.assignedAgentName}
          copyToastMessage="Employee copied"
        >
          <span className="text-sm font-medium">{row.original.assignedAgentName}</span>
        </DataTableCopyableText>
      ) : (
        <DataTableEmptyValue />
      ),
  },
  {
    id: 'summary',
    header: 'Summary',
    size: 112,
    minSize: 108,
    maxSize: 118,
    meta: {
      label: 'Summary',
      priority: 'primary',
      headerClassName: 'w-[112px]',
      cellClassName: 'w-[112px]',
      align: 'top',
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
    size: 180,
    minSize: 168,
    maxSize: 210,
    meta: {
      label: 'Success Rate',
      priority: 'primary',
      headerClassName: 'w-[180px] text-center',
      cellClassName: 'w-[180px]',
      align: 'middle',
    },
    cell: ({ row }) => {
      const stats = row.original.courier;
      const provider = row.original.courierProvider;
      const status = row.original.courierStatus;
      const consignment = row.original.courierConsignmentId;

      if (stats) {
        return (
          <div className="flex h-full flex-col items-center justify-center gap-1 py-0.5">
            <DataTableCourierStats
              shop={row.original.courierShop}
              network={stats}
              compact
            />
            {provider || status || consignment ? (
              <div className="max-w-full truncate text-center text-[10px] leading-snug text-muted-foreground">
                {provider === 'pathao' ? 'Pathao' : provider}
                {status ? ` · ${status}` : ''}
                {consignment ? ` · ${consignment}` : ''}
              </div>
            ) : null}
          </div>
        );
      }

      if (provider || status || consignment) {
        return (
          <div className="space-y-0.5 text-[11px] leading-snug">
            <p className="font-semibold capitalize text-foreground">
              {provider === 'pathao' ? 'Pathao' : provider || 'Courier'}
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
