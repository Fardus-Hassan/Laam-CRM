'use client';

import Link from 'next/link';
import type { ContactListItem } from '@laam/types';
import {
  CalendarClock,
  MessageCircle,
  MessageSquare,
  MessageSquarePlus,
  Phone,
  ShoppingBag,
} from 'lucide-react';

import type { CrmColumnDef } from '@/components/data-table';
import {
  DataTableCopyableText,
  DataTableEmptyValue,
  DataTablePersonCell,
  TruncatedText,
} from '@/components/data-table/cells';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CourierScoreCell } from '@/features/customers/components/shared/courier-score-cell';
import { ContactTypeBadge } from '@/features/contacts/components/shared/contact-type-badge';
import { CONTACT_SOURCE_LABELS } from '@/features/contacts/config/contact-filters';

export const CONTACT_TABLE_PINNED = {
  left: ['select', 'contactId'],
  right: ['actions'] as string[],
};

export function formatContactDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function buildContactTableColumns(options?: {
  onNoteClick?: (row: ContactListItem) => void;
  onFollowUpClick?: (row: ContactListItem) => void;
}): CrmColumnDef<ContactListItem>[] {
  const onNoteClick = options?.onNoteClick;
  const onFollowUpClick = options?.onFollowUpClick;

  return [
    {
      id: 'contactId',
      header: 'ID',
      size: 88,
      meta: { label: 'ID', priority: 'primary', align: 'top' },
      cell: ({ row }) => (
        <Link
          href={`/dashboard/contacts/${row.original.id}`}
          className="font-semibold tabular-nums text-primary hover:underline"
        >
          {row.original.contactNumber ?? row.original.id.replace('contact-', '')}
        </Link>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      size: 88,
      meta: { label: 'Type', priority: 'primary', align: 'middle' },
      cell: ({ row }) => <ContactTypeBadge type={row.original.contactType} />,
    },
    {
      id: 'notes',
      header: 'Notes',
      size: 48,
      meta: {
        label: 'Notes',
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
          onClick={() => onNoteClick?.(row.original)}
          aria-label="Contact notes"
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
      id: 'contact',
      header: 'Name & Number',
      size: 200,
      meta: { label: 'Contact', priority: 'primary', align: 'top' },
      cell: ({ row }) => {
        const phoneDigits = row.original.phone.replace(/\D/g, '');
        const subtitle =
          row.original.contactType === 'customer'
            ? `Join: ${formatContactDate(row.original.createdAt)}`
            : row.original.roleLabel ?? row.original.organizationName ?? '—';
        return (
          <div className="space-y-1.5">
            <DataTablePersonCell name={row.original.name} phone={subtitle} />
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
      size: 96,
      meta: { label: 'Orders', priority: 'primary', align: 'middle' },
      cell: ({ row }) =>
        row.original.contactType === 'customer' && row.original.orderCount !== undefined ? (
          <div className="tabular-nums">
            <p className="font-semibold">{row.original.orderCount}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.deliveredCount} delivered
            </p>
          </div>
        ) : (
          <DataTableEmptyValue />
        ),
    },
    {
      id: 'courier',
      header: 'Courier',
      size: 112,
      meta: { label: 'Courier score', priority: 'primary', align: 'middle' },
      cell: ({ row }) =>
        row.original.courierScore ? (
          <CourierScoreCell score={row.original.courierScore} compact />
        ) : (
          <DataTableEmptyValue />
        ),
    },
    {
      id: 'products',
      header: 'Products / Org',
      size: 160,
      meta: { label: 'Products', priority: 'secondary', align: 'top' },
      cell: ({ row }) => {
        if (row.original.recentProducts.length > 0) {
          return (
            <div className="space-y-1">
              {row.original.recentProducts.slice(0, 2).map((product, index) => (
                <div key={`${product.productName}-${index}`} className="text-xs">
                  <span className="text-muted-foreground">
                    {formatContactDate(product.orderedAt)}
                  </span>
                  <TruncatedText className="font-medium">{product.productName}</TruncatedText>
                </div>
              ))}
            </div>
          );
        }
        if (row.original.organizationName) {
          return (
            <div className="text-xs">
              <TruncatedText className="font-medium">{row.original.organizationName}</TruncatedText>
              {row.original.roleLabel ? (
                <p className="text-muted-foreground">{row.original.roleLabel}</p>
              ) : null}
            </div>
          );
        }
        return <DataTableEmptyValue />;
      },
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
          <DataTableEmptyValue />
        ),
    },
    {
      id: 'source',
      header: 'Source',
      size: 88,
      meta: { label: 'Source', priority: 'hidden-mobile', align: 'middle' },
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{CONTACT_SOURCE_LABELS[row.original.source]}</span>
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
      id: 'actions',
      header: '',
      size: 96,
      meta: {
        label: 'Actions',
        priority: 'primary',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        align: 'center',
      },
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          {row.original.contactType === 'customer' ? (
            <>
              <Button type="button" size="sm" className="h-7 px-2 text-xs" asChild>
                <Link
                  href={`/dashboard/orders/new?phone=${encodeURIComponent(row.original.phone)}`}
                >
                  <ShoppingBag className="size-3" />
                  Order
                </Link>
              </Button>
              {row.original.customerId ? (
                <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
                  <Link href={`/dashboard/companies/${row.original.customerId}`}>Customer</Link>
                </Button>
              ) : null}
            </>
          ) : (
            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
              <Link href={`/dashboard/contacts/${row.original.id}`}>View</Link>
            </Button>
          )}
        </div>
      ),
    },
  ];
}
