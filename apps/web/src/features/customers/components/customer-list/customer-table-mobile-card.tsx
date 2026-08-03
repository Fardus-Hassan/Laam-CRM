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
} from 'lucide-react';

import type { CrmRowContext } from '@/components/data-table';
import { DataTableCopyableText, DataTablePersonCell, TruncatedText } from '@/components/data-table/cells';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CourierScoreCell } from '@/features/customers/components/shared/courier-score-cell';
import { CustomerStatusSelect } from '@/features/customers/components/shared/customer-status-select';
import { formatCustomerDate } from '@/features/customers/components/customer-list/customer-table-columns';
import { formatCurrency } from '@/lib/format';

type CustomerTableMobileCardProps = {
  row: CustomerListItem;
  ctx: CrmRowContext<CustomerListItem>;
  onNoteClick?: (row: CustomerListItem) => void;
  onFollowUpClick?: (row: CustomerListItem) => void;
  statusOptions?: CustomerSegmentCount[];
  onStatusChange?: (row: CustomerListItem, status: CustomerStatus) => void | Promise<void>;
};

export function CustomerTableMobileCard({
  row,
  ctx,
  onNoteClick,
  onFollowUpClick,
  statusOptions = [],
  onStatusChange,
}: CustomerTableMobileCardProps) {
  const phoneDigits = row.phone.replace(/\D/g, '');

  return (
    <div className="divide-y divide-border/60">
      <header className="flex items-start gap-3 p-4">
        <Checkbox
          checked={ctx.isSelected}
          onCheckedChange={(value) => ctx.toggleSelected(Boolean(value))}
          aria-label={`Select customer ${row.name}`}
          className="mt-1"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {onStatusChange ? (
              <CustomerStatusSelect
                row={row}
                options={statusOptions}
                onChange={onStatusChange}
                compact
              />
            ) : null}
            <Link
              href={`/dashboard/customers/${row.id}`}
              className="text-base font-semibold text-primary hover:underline"
            >
              #{row.customerNumber}
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
          <DataTablePersonCell
            name={row.name}
            phone={`Joined ${formatCustomerDate(row.createdAt)}`}
          />
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
              onClick={() => window.open(`https://wa.me/${phoneDigits}`, '_blank', 'noopener,noreferrer')}
            >
              <MessageCircle className="size-3.5" />
            </Button>
            <Button type="button" size="sm" className="h-7 px-2" asChild>
              <Link href={`/dashboard/orders/new?phone=${encodeURIComponent(row.phone)}`}>
                <ShoppingBag className="size-3.5" />
                Order
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => onFollowUpClick?.(row)}
            >
              <CalendarClock className="size-3.5" />
            </Button>
          </div>
        </div>
      </header>
      <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Mobile</p>
          <DataTableCopyableText value={row.phone} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Orders</p>
          <p className="font-medium tabular-nums">
            {row.orderCount} · {row.deliveredCount} delivered
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total spent</p>
          <p className="font-medium tabular-nums">{formatCurrency(row.totalSpent)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Courier score</p>
          <CourierScoreCell
            score={row.courierScore}
            shop={row.courierShop}
            orderCount={row.orderCount}
            deliveredCount={row.deliveredCount}
            compact
          />
        </div>
        {row.recentProducts[0] ? (
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Last product</p>
            <TruncatedText>{row.recentProducts[0].productName}</TruncatedText>
          </div>
        ) : null}
        {row.address ? (
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Address</p>
            <TruncatedText className="text-muted-foreground">{row.address}</TruncatedText>
          </div>
        ) : null}
        {row.tags.length > 0 ? (
          <div className="sm:col-span-2 flex flex-wrap gap-1">
            {row.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
