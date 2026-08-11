'use client';

import * as React from 'react';
import Link from 'next/link';
import type { CustomerDetail } from '@laam/types';
import {
  CalendarClock,
  CircleDot,
  ShoppingBag,
  Ticket,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompactPager } from '@/components/ui/compact-pager';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { supportApi } from '@/features/support/api/support-api';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const TIMELINE_PAGE_SIZE = 6;

type TimelineKind = 'activity' | 'order' | 'followup' | 'ticket';

type TimelineItem = {
  id: string;
  label: string;
  description?: string;
  timestamp: string;
  kind: TimelineKind;
  href?: string;
};

type CustomerTimelineProps = {
  phone: string;
  activities: CustomerDetail['activities'];
  /** @deprecated Prefer default scannable layout */
  dense?: boolean;
};

const KIND_META: Record<
  TimelineKind,
  { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  followup: {
    label: 'Follow-up',
    className: 'border-primary/30 bg-primary/10 text-primary',
    Icon: CalendarClock,
  },
  order: {
    label: 'Order',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    Icon: ShoppingBag,
  },
  ticket: {
    label: 'Ticket',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    Icon: Ticket,
  },
  activity: {
    label: 'Activity',
    className: 'border-border bg-muted/40 text-muted-foreground',
    Icon: CircleDot,
  },
};

function orderHrefFromLabel(label: string): string | undefined {
  const match = label.match(/#?([A-Z]{0,4}-?\d{3,}|\d{4,})/i);
  if (!match?.[1]) return undefined;
  return `/dashboard/orders?search=${encodeURIComponent(match[1])}`;
}

/** Readable activity feed — order · follow-up · ticket at a glance. */
export function CustomerTimeline({ phone, activities }: CustomerTimelineProps) {
  const [tickets, setTickets] = React.useState<TimelineItem[]>([]);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    let cancelled = false;
    void supportApi
      .listTickets({ search: phone, page: 1, pageSize: 20 })
      .then((res) => {
        if (cancelled) return;
        const digits = phone.replace(/\D/g, '');
        setTickets(
          res.items
            .filter((t) => t.customerMobile.replace(/\D/g, '') === digits)
            .map((t) => ({
              id: `tk-${t.id}`,
              label: t.subject,
              description: t.status,
              timestamp: t.createdAt,
              kind: 'ticket' as const,
              href: `/dashboard/support?search=${encodeURIComponent(t.customerMobile)}`,
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setTickets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [phone]);

  const items = React.useMemo(() => {
    const timeline: TimelineItem[] = activities.map((a) => {
      const lower = a.label.toLowerCase();
      const kind: TimelineKind = lower.includes('follow')
        ? 'followup'
        : lower.startsWith('order') || lower.includes('order #')
          ? 'order'
          : 'activity';
      return {
        id: a.id,
        label: a.label,
        description: a.description,
        timestamp: a.timestamp,
        kind,
        href: kind === 'order' ? orderHrefFromLabel(a.label) : undefined,
      };
    });

    return [...timeline, ...tickets].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [activities, tickets]);

  React.useEffect(() => {
    setPage(1);
  }, [items.length, phone]);

  const totalPages = Math.max(1, Math.ceil(items.length / TIMELINE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice(
    (safePage - 1) * TIMELINE_PAGE_SIZE,
    safePage * TIMELINE_PAGE_SIZE,
  );

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          Timeline
          {items.length > 0 ? (
            <Badge variant="secondary" className="font-normal tabular-nums">
              {items.length}
            </Badge>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('space-y-2', ORDER_SECTION_BODY_CLASS)}>
        {!items.length ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <>
            <ul className="space-y-0">
              {pageItems.map((item, index) => {
                const meta = KIND_META[item.kind];
                const Icon = meta.Icon;
                const isLast = index === pageItems.length - 1;
                return (
                  <li key={item.id} className="relative flex gap-3 pb-3 last:pb-0">
                    {!isLast ? (
                      <span
                        className="absolute top-6 bottom-0 left-[11px] w-px bg-border"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={cn(
                        'relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-full border',
                        meta.className,
                      )}
                    >
                      <Icon className="size-3" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5 pt-0.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium">{item.label}</p>
                        )}
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] font-normal capitalize', meta.className)}
                        >
                          {meta.label}
                        </Badge>
                      </div>
                      {item.description ? (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatDateTime(item.timestamp)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {items.length > TIMELINE_PAGE_SIZE ? (
              <CompactPager
                page={safePage}
                totalPages={totalPages}
                totalItems={items.length}
                pageSize={TIMELINE_PAGE_SIZE}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
