'use client';

import Link from 'next/link';
import type { FollowupListItem, FollowupStatus } from '@laam/types';
import {
  CalendarClock,
  MessageCircle,
  MessageSquare,
  MessageSquarePlus,
  Phone,
  ShoppingBag,
} from 'lucide-react';

import type { CrmRowContext } from '@/components/data-table';
import { DataTableCopyableText, TruncatedText } from '@/components/data-table/cells';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  FOLLOWUP_SMS_LABELS,
  FOLLOWUP_STATUS_LABELS,
  FOLLOWUP_TYPE_LABELS,
} from '@/features/followups/config/followup-filters';
import { formatFollowupDate } from '@/features/followups/components/followup-list/followup-table-columns';
import { FormSelect } from '@/components/form/form-select';

type FollowupTableMobileCardProps = {
  row: FollowupListItem;
  ctx: CrmRowContext<FollowupListItem>;
  onScheduleChange?: (row: FollowupListItem, date: string) => void;
  onSkip?: (row: FollowupListItem) => void;
  onFollowupNoteClick?: (row: FollowupListItem) => void;
  onCustomerNoteClick?: (row: FollowupListItem) => void;
  onDetailsClick?: (row: FollowupListItem) => void;
  onStatusChange?: (row: FollowupListItem, status: FollowupStatus) => void;
};

const STATUS_OPTIONS = (
  Object.keys(FOLLOWUP_STATUS_LABELS) as FollowupStatus[]
).map((value) => ({ value, label: FOLLOWUP_STATUS_LABELS[value] }));

export function FollowupTableMobileCard({
  row,
  ctx,
  onScheduleChange,
  onSkip,
  onFollowupNoteClick,
  onCustomerNoteClick,
  onDetailsClick,
  onStatusChange,
}: FollowupTableMobileCardProps) {
  const phoneDigits = row.phone.replace(/\D/g, '');

  return (
    <div className="divide-y divide-border/60">
      <header className="flex items-start gap-3 p-4">
        <Checkbox
          checked={ctx.isSelected}
          onCheckedChange={(value) => ctx.toggleSelected(Boolean(value))}
          aria-label={`Select ${row.name}`}
          className="mt-1"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {FOLLOWUP_TYPE_LABELS[row.type]}
            </Badge>
            <Badge
              variant={row.smsStatus === 'sent' ? 'default' : 'secondary'}
              className="text-[10px]"
            >
              SMS: {FOLLOWUP_SMS_LABELS[row.smsStatus]}
            </Badge>
          </div>
          <Link
            href={`/dashboard/companies/${row.customerId}`}
            className="text-base font-semibold text-primary hover:underline"
          >
            {row.name}
          </Link>
          {row.address ? (
            <TruncatedText className="text-xs text-muted-foreground">{row.address}</TruncatedText>
          ) : null}
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

      <div className="space-y-3 px-4 py-3">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Schedule date</p>
          <input
            type="date"
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={row.scheduleDate ?? ''}
            onChange={(e) => onScheduleChange?.(row, e.target.value)}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Follow-up status</p>
          <FormSelect
            value={row.followupStatus}
            onChange={(value) => onStatusChange?.(row, value as FollowupStatus)}
            options={STATUS_OPTIONS}
            searchable={false}
          />
        </div>
        {row.recentProducts.length > 0 ? (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Last order</p>
            {row.recentProducts.slice(0, 1).map((p, i) => (
              <p key={i} className="text-xs">
                {formatFollowupDate(p.orderedAt)} — {p.productName}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <footer className="flex flex-wrap gap-2 px-4 py-3">
        <Button type="button" size="sm" className="h-7" asChild>
          <Link href={`/dashboard/orders/new?phone=${encodeURIComponent(row.phone)}`}>
            <ShoppingBag className="size-3.5" />
            Create order
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => onDetailsClick?.(row)}
        >
          <CalendarClock className="size-3.5" />
          Details
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => onFollowupNoteClick?.(row)}
        >
          {row.hasFollowupNotes ? (
            <MessageSquare className="size-3.5 text-primary" />
          ) : (
            <MessageSquarePlus className="size-3.5 text-muted-foreground" />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => onCustomerNoteClick?.(row)}
        >
          {row.hasCustomerNotes ? (
            <MessageSquare className="size-3.5 text-primary" />
          ) : (
            <MessageSquarePlus className="size-3.5 text-muted-foreground" />
          )}
        </Button>
        {!row.skipped ? (
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onSkip?.(row)}>
            Skip
          </Button>
        ) : null}
      </footer>
    </div>
  );
}
