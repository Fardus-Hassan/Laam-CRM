'use client';

import Link from 'next/link';
import type { CustomerListItem, CustomerSegmentCount, CustomerStatus } from '@laam/types';
import {
  CalendarClock,
  MessageCircle,
  MessageSquare,
  MessageSquarePlus,
  Phone,
  ShoppingBag,
  Tag,
} from 'lucide-react';

import type { CrmColumnDef } from '@/components/data-table';
import {
  DataTableCopyableText,
  DataTableDateTime,
  DataTableEmptyValue,
  DataTablePersonCell,
  TruncatedText,
} from '@/components/data-table/cells';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTableCourierStats } from '@/components/data-table/cells';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CustomerStatusSelect } from '@/features/customers/components/shared/customer-status-select';
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
  onFollowUpClick?: (row: CustomerListItem) => void;
  statusOptions?: CustomerSegmentCount[];
  onStatusChange?: (row: CustomerListItem, status: CustomerStatus) => void | Promise<void>;
}): CrmColumnDef<CustomerListItem>[] {
  const onNoteClick = options?.onNoteClick;
  const onFollowUpClick = options?.onFollowUpClick;
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
      size: 200,
      meta: { label: 'Customer', priority: 'primary', align: 'top' },
      cell: ({ row }) => {
        const phoneDigits = row.original.phone.replace(/\D/g, '');
        return (
          <div className="space-y-1.5">
            <DataTablePersonCell
              name={row.original.name}
              phone={`Join: ${formatCustomerDate(row.original.createdAt)}`}
            />
            <div className="flex flex-wrap items-center gap-1">
              <Button type="button" size="sm" variant="outline" className="h-6 px-1.5" asChild>
                <a href={`tel:${phoneDigits}`}>
                  <Phone className="size-3" />
                </a>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 px-1.5"
                onClick={() => {
                  window.open(`https://wa.me/${phoneDigits}`, '_blank', 'noopener,noreferrer');
                }}
              >
                <MessageCircle className="size-3" />
              </Button>
              <DataTableCopyableText value={row.original.phone} className="text-xs" />
            </div>
          </div>
        );
      },
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
      size: 88,
      meta: { label: 'Follow-up', priority: 'secondary', align: 'middle' },
      cell: ({ row }) => (
        <Button
          type="button"
          size="sm"
          variant={row.original.hasFollowUp ? 'secondary' : 'outline'}
          className="h-7 px-2 text-xs"
          onClick={() => onFollowUpClick?.(row.original)}
        >
          <CalendarClock className="size-3" />
          {row.original.hasFollowUp ? 'Due' : 'Set'}
        </Button>
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
            <Link
              href={`/dashboard/orders/new?phone=${encodeURIComponent(row.original.phone)}`}
            >
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
