'use client';

import * as React from 'react';
import type { CustomerDetail } from '@laam/types';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { supportApi } from '@/features/support/api/support-api';
import { formatDateTime } from '@/lib/format';

type TimelineItem = {
  id: string;
  label: string;
  description?: string;
  timestamp: string;
  kind: 'activity' | 'order' | 'followup' | 'ticket';
};

type CustomerTimelineProps = {
  phone: string;
  activities: CustomerDetail['activities'];
};

export function CustomerTimeline({ phone, activities }: CustomerTimelineProps) {
  const [tickets, setTickets] = React.useState<TimelineItem[]>([]);

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
              label: `Ticket: ${t.subject}`,
              description: t.status,
              timestamp: t.createdAt,
              kind: 'ticket' as const,
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
    const timeline: TimelineItem[] = activities.map((a) => ({
      id: a.id,
      label: a.label,
      description: a.description,
      timestamp: a.timestamp,
      kind: a.label.toLowerCase().includes('follow')
        ? ('followup' as const)
        : a.label.toLowerCase().startsWith('order')
          ? ('order' as const)
          : ('activity' as const),
    }));

    return [...timeline, ...tickets].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [activities, tickets]);

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">Timeline</CardTitle>
      </CardHeader>
      <CardContent className={ORDER_SECTION_BODY_CLASS}>
        {!items.length ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.description ? (
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {item.kind}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTime(item.timestamp)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
