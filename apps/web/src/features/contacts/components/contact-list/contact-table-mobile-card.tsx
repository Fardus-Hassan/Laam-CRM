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

import type { CrmRowContext } from '@/components/data-table';
import { DataTableCopyableText, DataTablePersonCell, TruncatedText } from '@/components/data-table/cells';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CourierScoreCell } from '@/features/customers/components/shared/courier-score-cell';
import { ContactTypeBadge } from '@/features/contacts/components/shared/contact-type-badge';
import { formatContactDate } from '@/features/contacts/components/contact-list/contact-table-columns';

type ContactTableMobileCardProps = {
  row: ContactListItem;
  ctx: CrmRowContext<ContactListItem>;
  onNoteClick?: (row: ContactListItem) => void;
  onFollowUpClick?: (row: ContactListItem) => void;
};

export function ContactTableMobileCard({
  row,
  ctx,
  onNoteClick,
  onFollowUpClick,
}: ContactTableMobileCardProps) {
  const phoneDigits = row.phone.replace(/\D/g, '');
  const subtitle =
    row.contactType === 'customer'
      ? `Joined ${formatContactDate(row.createdAt)}`
      : row.roleLabel ?? row.organizationName ?? '—';

  return (
    <div className="divide-y divide-border/60">
      <header className="flex items-start gap-3 p-4">
        <Checkbox
          checked={ctx.isSelected}
          onCheckedChange={(value) => ctx.toggleSelected(Boolean(value))}
          aria-label={`Select contact ${row.name}`}
          className="mt-1"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ContactTypeBadge type={row.contactType} />
            <Link
              href={`/dashboard/contacts/${row.id}`}
              className="text-base font-semibold text-primary hover:underline"
            >
              {row.contactNumber ? `#${row.contactNumber}` : row.name}
            </Link>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => onNoteClick?.(row)}
            >
              {row.hasNotes ? (
                <MessageSquare className="size-3.5 text-primary" />
              ) : (
                <MessageSquarePlus className="size-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>
          <DataTablePersonCell name={row.name} phone={subtitle} />
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="outline" className="h-7 px-2" asChild>
              <a href={`tel:${phoneDigits}`}>
                <Phone className="size-3.5" />
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
            </Button>
            <DataTableCopyableText value={row.phone} className="text-xs" />
          </div>
        </div>
      </header>

      {row.contactType === 'customer' && row.orderCount !== undefined ? (
        <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Orders</p>
            <p className="font-semibold tabular-nums">
              {row.orderCount}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                ({row.deliveredCount} delivered)
              </span>
            </p>
          </div>
          {row.courierScore ? (
            <div>
              <p className="text-xs text-muted-foreground">Courier</p>
              <CourierScoreCell score={row.courierScore} compact />
            </div>
          ) : null}
        </div>
      ) : row.organizationName ? (
        <div className="px-4 py-3 text-sm">
          <p className="text-xs text-muted-foreground">Organization</p>
          <TruncatedText className="font-medium">{row.organizationName}</TruncatedText>
          {row.roleLabel ? <p className="text-xs text-muted-foreground">{row.roleLabel}</p> : null}
        </div>
      ) : null}

      {row.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1 px-4 py-3">
          {row.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}

      <footer className="flex flex-wrap gap-2 px-4 py-3">
        <Button
          type="button"
          size="sm"
          variant={row.hasFollowUp ? 'secondary' : 'outline'}
          className="h-7"
          onClick={() => onFollowUpClick?.(row)}
        >
          <CalendarClock className="size-3.5" />
          {row.hasFollowUp ? 'Follow-up due' : 'Set follow-up'}
        </Button>
        {row.contactType === 'customer' ? (
          <Button type="button" size="sm" className="h-7" asChild>
            <Link href={`/dashboard/orders/new?phone=${encodeURIComponent(row.phone)}`}>
              <ShoppingBag className="size-3.5" />
              New order
            </Link>
          </Button>
        ) : null}
      </footer>
    </div>
  );
}
