'use client';

import Link from 'next/link';
import type { FollowupListItem, FollowupStatus } from '@laam/types';
import {
  MessageCircle,
  MessageSquare,
  MessageSquarePlus,
  Phone,
  ShoppingBag,
} from 'lucide-react';

import type { CrmColumnDef } from '@/components/data-table';
import {
  DataTableCopyableText,
  DataTableDateTime,
  DataTableEmptyValue,
  TruncatedText,
} from '@/components/data-table/cells';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FOLLOWUP_SMS_LABELS,
  FOLLOWUP_STATUS_LABELS,
  FOLLOWUP_TYPE_LABELS,
} from '@/features/followups/config/followup-filters';
import { FormSelect } from '@/components/form/form-select';
import { formatDate, formatDateTime } from '@/lib/format';

export const FOLLOWUP_TABLE_PINNED = {
  left: ['select', 'sl'],
  right: [] as string[],
};

export function formatFollowupDate(value: string) {
  return formatDate(value);
}

export function formatFollowupDateTime(value: string) {
  return formatDateTime(value);
}

const STATUS_OPTIONS = (
  Object.keys(FOLLOWUP_STATUS_LABELS) as FollowupStatus[]
).map((value) => ({
  value,
  label: FOLLOWUP_STATUS_LABELS[value],
}));

const TAG_OPTIONS = [
  { value: '', label: 'No tag' },
];

export function buildFollowupTableColumns(options?: {
  rowOffset?: number;
  onScheduleChange?: (row: FollowupListItem, date: string) => void;
  onSkip?: (row: FollowupListItem) => void;
  onFollowupNoteClick?: (row: FollowupListItem) => void;
  onCustomerNoteClick?: (row: FollowupListItem) => void;
  onDetailsClick?: (row: FollowupListItem) => void;
  onStatusChange?: (row: FollowupListItem, status: FollowupStatus) => void;
  onTagChange?: (row: FollowupListItem, tag: string) => void;
}): CrmColumnDef<FollowupListItem>[] {
  const rowOffset = options?.rowOffset ?? 0;

  return [
    {
      id: 'sl',
      header: 'SL',
      size: 48,
      meta: { label: 'SL', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{rowOffset + row.index + 1}</span>
      ),
    },
    {
      id: 'schedule',
      header: 'Schedule',
      size: 140,
      meta: { label: 'Schedule date', priority: 'primary', align: 'top' },
      cell: ({ row }) => (
        <div className="space-y-1.5">
          <input
            type="date"
            className="flex h-8 w-full min-w-[120px] rounded-md border border-input bg-background px-2 text-xs"
            value={row.original.scheduleDate ?? ''}
            onChange={(e) => options?.onScheduleChange?.(row.original, e.target.value)}
          />
          <Button type="button" size="sm" className="h-7 w-full px-2 text-xs" asChild>
            <Link
              href={`/dashboard/orders/new?phone=${encodeURIComponent(row.original.phone)}`}
            >
              <ShoppingBag className="size-3" />
              Create order
            </Link>
          </Button>
          {!row.original.skipped ? (
            <button
              type="button"
              className="text-[10px] text-muted-foreground underline hover:text-foreground"
              onClick={() => options?.onSkip?.(row.original)}
            >
              Mark skip follow-up
            </button>
          ) : (
            <span className="text-[10px] text-amber-600">Skipped</span>
          )}
        </div>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      size: 180,
      meta: { label: 'Customer', priority: 'primary', align: 'top' },
      cell: ({ row }) => (
        <div className="space-y-1">
          <Link
            href={`/dashboard/companies/${row.original.customerId}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.name}
          </Link>
          {row.original.address ? (
            <TruncatedText className="text-xs text-muted-foreground">
              {row.original.address}
            </TruncatedText>
          ) : (
            <DataTableEmptyValue />
          )}
        </div>
      ),
    },
    {
      id: 'mobile',
      header: 'Mobile',
      size: 160,
      meta: { label: 'Mobile', priority: 'primary', align: 'top' },
      cell: ({ row }) => {
        const phoneDigits = row.original.phone.replace(/\D/g, '');
        return (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1">
              <DataTableCopyableText value={row.original.phone} className="text-xs font-medium" />
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
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => options?.onDetailsClick?.(row.original)}
            >
              Follow-up details
            </Button>
          </div>
        );
      },
    },
    {
      id: 'followupNotes',
      header: () => (
        <span className="flex flex-col items-center gap-0 leading-tight">
          <span>Followup</span>
          <span>Notes</span>
        </span>
      ),
      size: 64,
      meta: {
        label: 'Follow-up notes',
        priority: 'secondary',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        align: 'middle',
      },
      cell: ({ row }) => (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => options?.onFollowupNoteClick?.(row.original)}
        >
          {row.original.hasFollowupNotes ? (
            <MessageSquare className="size-3.5 text-primary" />
          ) : (
            <MessageSquarePlus className="size-3.5 text-muted-foreground" />
          )}
        </Button>
      ),
    },
    {
      id: 'customerNotes',
      header: () => (
        <span className="flex flex-col items-center gap-0 leading-tight">
          <span>Customer</span>
          <span>Notes</span>
        </span>
      ),
      size: 64,
      meta: {
        label: 'Customer notes',
        priority: 'secondary',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        align: 'middle',
      },
      cell: ({ row }) => (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => options?.onCustomerNoteClick?.(row.original)}
        >
          {row.original.hasCustomerNotes ? (
            <MessageSquare className="size-3.5 text-primary" />
          ) : (
            <MessageSquarePlus className="size-3.5 text-muted-foreground" />
          )}
        </Button>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      size: 72,
      meta: { label: 'Type', priority: 'secondary', align: 'middle' },
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-[10px]">
          {FOLLOWUP_TYPE_LABELS[row.original.type]}
        </Badge>
      ),
    },
    {
      id: 'tag',
      header: 'Tag',
      size: 120,
      meta: { label: 'Tag', priority: 'secondary', align: 'middle' },
      cell: ({ row }) => (
        <FormSelect
          value={row.original.tags[0] ?? ''}
          onChange={(value) => options?.onTagChange?.(row.original, value)}
          options={TAG_OPTIONS}
          searchable={false}
          className="h-8 min-w-[100px] text-xs"
        />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      size: 120,
      meta: { label: 'Follow-up status', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <FormSelect
          value={row.original.followupStatus}
          onChange={(value) =>
            options?.onStatusChange?.(row.original, value as FollowupStatus)
          }
          options={STATUS_OPTIONS}
          searchable={false}
          className="h-8 min-w-[100px] text-xs"
        />
      ),
    },
    {
      id: 'products',
      header: 'Order product',
      size: 160,
      meta: { label: 'Products', priority: 'secondary', align: 'top' },
      cell: ({ row }) =>
        row.original.recentProducts.length > 0 ? (
          <div className="space-y-1">
            {row.original.recentProducts.slice(0, 2).map((product, index) => (
              <div key={`${product.productName}-${index}`} className="text-xs">
                <span className="text-muted-foreground">
                  {formatFollowupDate(product.orderedAt)}
                </span>
                <TruncatedText className="font-medium">
                  {product.quantity ? `${product.quantity} × ` : ''}
                  {product.productName}
                </TruncatedText>
              </div>
            ))}
          </div>
        ) : (
          <DataTableEmptyValue />
        ),
    },
    {
      id: 'sms',
      header: 'SMS',
      size: 80,
      meta: { label: 'SMS status', priority: 'hidden-mobile', align: 'middle' },
      cell: ({ row }) => (
        <Badge
          variant={row.original.smsStatus === 'sent' ? 'default' : 'secondary'}
          className="text-[10px]"
        >
          {FOLLOWUP_SMS_LABELS[row.original.smsStatus]}
        </Badge>
      ),
    },
    {
      id: 'assigned',
      header: 'Assigned',
      size: 100,
      meta: { label: 'Assigned', priority: 'hidden-mobile', align: 'middle' },
      cell: ({ row }) => (
        <span className="text-xs">{row.original.assignedAgentName ?? '—'}</span>
      ),
    },
    {
      id: 'createdAt',
      header: 'Created',
      size: 110,
      meta: { label: 'Created at', priority: 'hidden-mobile', align: 'middle' },
      cell: ({ row }) => (
        <DataTableDateTime
          value={row.original.createdAt}
          formatter={formatFollowupDateTime}
        />
      ),
    },
  ];
}
