'use client';

import Link from 'next/link';
import type { CustomerListItem, CustomerSegmentCount, CustomerStatus } from '@laam/types';
import {
  MessageSquare,
  MessageSquarePlus,
  ShoppingBag,
  Tag,
} from 'lucide-react';

import type { CrmColumnDef } from '@/components/data-table';
import {
  DataTableDateTime,
  DataTableEmptyValue,
  DataTablePersonCell,
  TruncatedText,
} from '@/components/data-table/cells';
import { FormPhoneInput } from '@/components/form/form-phone-input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTableCourierStats } from '@/components/data-table/cells';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CustomerFollowUpControl } from '@/features/customers/components/shared/customer-follow-up-control';
import { CustomerStatusSelect } from '@/features/customers/components/shared/customer-status-select';
import { customerCreateOrderHref } from '@/features/customers/lib/customer-create-order-href';
import { formatDate, formatDateTime } from '@/lib/format';

export const CUSTOMER_TABLE_PINNED = {
  left: ['select', 'customerNumber'],
  right: ['actions'] as string[],
};

export function formatCustomerDate(value: string) {
  return formatDate(value);
}

export function formatCustomerDateTime(value: string) {
  return formatDateTime(value);
}

export function buildCustomerTableColumns(options?: {
  onNoteClick?: (row: CustomerListItem) => void;
  onFollowUpSaved?: (row: CustomerListItem, followUpDue: string) => void;
  statusOptions?: CustomerSegmentCount[];
  onStatusChange?: (row: CustomerListItem, status: CustomerStatus) => void | Promise<void>;
}): CrmColumnDef<CustomerListItem>[] {
  const onNoteClick = options?.onNoteClick;
  const onFollowUpSaved = options?.onFollowUpSaved;
  const statusOptions = options?.statusOptions ?? [];
  const onStatusChange = options?.onStatusChange;

  return [
    {
      id: 'customerNumber',
      header: 'ID',
      size: 88,
      meta: { label: 'ID', priority: 'primary', align: 'top' },
      cell: ({ row }) => (
        <Link
          href={`/dashboard/customers/${row.original.id}`}
          className="font-semibold tabular-nums text-primary hover:underline"
        >
          {row.original.customerNumber}
        </Link>
      ),
    },
    {
      id: 'notes',
      header: 'Notes',
      size: 68,
      minSize: 60,
      maxSize: 80,
      meta: {
        label: 'Notes',
        priority: 'secondary',
        headerClassName: 'px-2 text-center',
        cellClassName: 'px-2 text-center',
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
                  row.original.hasNotes
                    ? 'size-8 text-primary'
                    : 'size-8 text-muted-foreground'
                }
                aria-label={row.original.hasNotes ? 'View note' : 'Add note'}
                onClick={() => onNoteClick?.(row.original)}
              >
                {row.original.hasNotes ? (
                  <MessageSquare className="size-4" />
                ) : (
                  <MessageSquarePlus className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[220px]">
              {row.original.lastNotePreview?.trim()
                ? row.original.lastNotePreview
                : row.original.hasNotes
                  ? 'Open to view note'
                  : 'Add note'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      id: 'customer',
      header: 'Name & Number',
      size: 280,
      minSize: 260,
      meta: { label: 'Customer', priority: 'primary', align: 'top' },
      cell: ({ row }) => (
        <DataTablePersonCell
          compact
          className="w-max max-w-full"
          name={row.original.name}
          sourceLabel={`Join ${formatCustomerDate(row.original.createdAt)}`}
          phoneSlot={
            <div className="flex max-w-full items-center gap-0.5">
              <FormPhoneInput
                value={row.original.phone}
                readOnly
                layout="inline"
                showCopy
                showSms
                showCall
                showWhatsapp
                className="pointer-events-auto h-8"
              />
            </div>
          }
        />
      ),
    },
    {
      id: 'orders',
      header: 'Orders',
      size: 72,
      meta: { label: 'Orders', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <p className="font-semibold tabular-nums">{row.original.orderCount}</p>
      ),
    },
    {
      id: 'delivered',
      header: 'Delivered',
      size: 88,
      meta: {
        label: 'Delivered completed',
        priority: 'primary',
        align: 'middle',
      },
      cell: ({ row }) => (
        <div className="tabular-nums">
          <p className="font-semibold">{row.original.deliveredCount}</p>
          <p className="text-[10px] text-muted-foreground">completed</p>
        </div>
      ),
    },
    {
      id: 'courier',
      header: 'Success Rate',
      size: 168,
      meta: {
        label: 'Success Rate',
        priority: 'primary',
        align: 'middle',
        headerClassName: '',
      },
      cell: ({ row }) => {
        const score = row.original.courierScore;
        return (
          <DataTableCourierStats
            shop={
              row.original.courierShop ?? {
                to: row.original.orderCount,
                co: row.original.deliveredCount,
              }
            }
            network={{
              to: score.total,
              co: Math.max(0, score.total - score.success - score.failed),
              su: score.success,
              fa: score.failed,
              percent: score.rate,
              label:
                score.total >= 10
                  ? 'Frequent'
                  : score.total >= 2
                    ? 'Regular'
                    : score.total > 0
                      ? 'New'
                      : '—',
            }}
            compact
          />
        );
      },
    },
    {
      id: 'products',
      header: 'Products',
      size: 160,
      meta: { label: 'Products', priority: 'secondary', align: 'top' },
      cell: ({ row }) =>
        row.original.recentProducts.length > 0 ? (
          <div className="space-y-1">
            {row.original.recentProducts.slice(0, 2).map((product, index) => (
              <div key={`${product.productName}-${index}`} className="text-xs">
                <span className="text-muted-foreground">
                  {formatCustomerDate(product.orderedAt)}
                </span>
                <TruncatedText className="font-medium">{product.productName}</TruncatedText>
              </div>
            ))}
          </div>
        ) : (
          <DataTableEmptyValue />
        ),
    },
    {
      id: 'address',
      header: 'Address',
      size: 140,
      meta: { label: 'Address', priority: 'secondary', align: 'top' },
      cell: ({ row }) =>
        row.original.address ? (
          <TruncatedText className="text-xs text-muted-foreground">{row.original.address}</TruncatedText>
        ) : (
          <DataTableEmptyValue />
        ),
    },
    {
      id: 'tags',
      header: 'Tags',
      size: 100,
      meta: { label: 'Tags', priority: 'secondary', align: 'middle' },
      cell: ({ row }) =>
        row.original.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Tag className="size-3" />
            No tag
          </span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      size: 160,
      meta: { label: 'Status', priority: 'secondary', align: 'middle' },
      cell: ({ row }) =>
        onStatusChange ? (
          <CustomerStatusSelect
            row={row.original}
            options={statusOptions}
            onChange={onStatusChange}
            compact
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {row.original.statusLabel || row.original.status}
          </span>
        ),
    },
    {
      id: 'followup',
      header: 'Follow-up',
      size: 100,
      meta: { label: 'Follow-up', priority: 'secondary', align: 'middle' },
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col items-start gap-1">
          {row.original.followUpDue ? (
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {formatCustomerDate(row.original.followUpDue)}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
          <CustomerFollowUpControl
            customerId={row.original.id}
            customerName={row.original.name}
            followUpDue={row.original.followUpDue}
            hasFollowUp={row.original.hasFollowUp}
            assignedAgentName={row.original.assignedAgentName}
            onSaved={(due) => onFollowUpSaved?.(row.original, due)}
          />
        </div>
      ),
    },
    {
      id: 'lastOrder',
      header: 'Last order',
      size: 100,
      meta: { label: 'Last order', priority: 'hidden-mobile', align: 'middle' },
      cell: ({ row }) =>
        row.original.lastOrderAt ? (
          <DataTableDateTime value={row.original.lastOrderAt} formatter={formatCustomerDate} />
        ) : (
          <DataTableEmptyValue />
        ),
    },
    {
      id: 'actions',
      header: '',
      size: 88,
      meta: {
        label: 'Actions',
        priority: 'primary',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        align: 'center',
      },
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <Button type="button" size="sm" className="h-7 px-2 text-xs" asChild>
            <Link href={customerCreateOrderHref(row.original.phone)}>
              <ShoppingBag className="size-3" />
              Order
            </Link>
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
            <Link href={`/dashboard/customers/${row.original.id}`}>View</Link>
          </Button>
        </div>
      ),
    },
  ];
}
