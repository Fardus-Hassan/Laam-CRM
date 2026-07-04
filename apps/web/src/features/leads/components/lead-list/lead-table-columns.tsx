'use client';

import Link from 'next/link';
import type { LeadListItem } from '@laam/types';
import { MessageCircle, MessageSquare, MessageSquarePlus, Phone, ShoppingBag } from 'lucide-react';

import type { CrmColumnDef } from '@/components/data-table';
import {
  DataTableCopyableText,
  DataTableDateTime,
  DataTableEmptyValue,
  DataTablePersonCell,
  TruncatedText,
} from '@/components/data-table/cells';
import { EntityStatusBadge } from '@/components/dashboard/entity-status-badge';
import { Button } from '@/components/ui/button';
import { LEAD_SOURCE_LABELS } from '@/features/leads/config/lead-filters';
import { formatCurrency } from '@/lib/format';

export const LEAD_TABLE_PINNED = {
  left: ['select', 'status'],
  right: ['actions'] as string[],
};

export function formatLeadDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
    .format(new Date(value))
    .replace(',', ' -');
}

export function buildLeadTableColumns(options?: {
  onNoteClick?: (row: LeadListItem) => void;
  onConvertClick?: (row: LeadListItem) => void;
}): CrmColumnDef<LeadListItem>[] {
  const onNoteClick = options?.onNoteClick;
  const onConvertClick = options?.onConvertClick;

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
        <div className="mx-auto flex justify-center">
          <EntityStatusBadge status={row.original.status} kind="lead" />
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
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => onNoteClick?.(row.original)}
          aria-label="View notes"
        >
          {row.original.hasNotes ? (
            <MessageSquare className="size-3.5 text-primary" />
          ) : (
            <MessageSquarePlus className="size-3.5 text-muted-foreground" />
          )}
        </Button>
      ),
    },
    {
      id: 'leadId',
      header: 'ID & Campaign',
      enableSorting: true,
      size: 120,
      meta: { label: 'Lead ID', priority: 'primary', align: 'top' },
      cell: ({ row }) => {
        const displayId = row.original.leadNumber.replace(/^LD-/, '');
        return (
          <div className="space-y-0.5">
            <Link
              href={`/dashboard/leads/${row.original.leadNumber}`}
              className="font-semibold text-primary hover:underline"
            >
              #{displayId}
            </Link>
            <TruncatedText className="text-xs text-muted-foreground">
              {row.original.campaignName ?? '—'}
            </TruncatedText>
          </div>
        );
      },
    },
    {
      id: 'products',
      header: 'Products',
      size: 120,
      meta: { label: 'Products', priority: 'secondary', align: 'top' },
      cell: ({ row }) =>
        row.original.productSummary ? (
          <div className="space-y-0.5">
            <TruncatedText className="text-sm font-medium">{row.original.productSummary}</TruncatedText>
            {(row.original.itemCount ?? 0) > 1 ? (
              <p className="text-xs text-muted-foreground">{row.original.itemCount} items</p>
            ) : null}
          </div>
        ) : (
          <DataTableEmptyValue />
        ),
    },
    {
      id: 'customer',
      header: 'Name & Number',
      enableSorting: true,
      size: 160,
      meta: { label: 'Customer', priority: 'primary', align: 'top' },
      cell: ({ row }) => {
        const phoneDigits = row.original.phone.replace(/\D/g, '');
        return (
          <div className="space-y-1.5">
            <DataTablePersonCell
              name={row.original.name}
              phone={row.original.area}
              sourceLabel={LEAD_SOURCE_LABELS[row.original.source]}
            />
            <div className="flex flex-wrap gap-1">
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
      id: 'agent',
      header: 'Agent',
      size: 96,
      meta: { label: 'Agent', priority: 'secondary', align: 'middle' },
      cell: ({ row }) =>
        row.original.assignedAgentName ? (
          <TruncatedText>{row.original.assignedAgentName}</TruncatedText>
        ) : (
          <span className="text-xs font-medium text-violet-600">Unassigned</span>
        ),
    },
    {
      id: 'value',
      header: 'Est. Value',
      enableSorting: true,
      size: 88,
      meta: { label: 'Value', priority: 'secondary', align: 'middle' },
      cell: ({ row }) =>
        row.original.estimatedValue ? (
          <span className="font-medium tabular-nums">
            {formatCurrency(row.original.estimatedValue)}
          </span>
        ) : (
          <DataTableEmptyValue />
        ),
    },
    {
      id: 'date',
      header: 'Created',
      enableSorting: true,
      size: 112,
      meta: { label: 'Created', priority: 'secondary', align: 'middle' },
      cell: ({ row }) => (
        <DataTableDateTime value={row.original.createdAt} formatter={formatLeadDateTime} />
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 72,
      meta: {
        label: 'Actions',
        priority: 'secondary',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        align: 'center',
      },
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
            <Link href={`/dashboard/leads/${row.original.leadNumber}`}>View</Link>
          </Button>
          {row.original.status !== 'converted' ? (
            <Button
              type="button"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onConvertClick?.(row.original)}
            >
              <ShoppingBag className="size-3" />
              Convert
            </Button>
          ) : null}
        </div>
      ),
    },
  ];
}
