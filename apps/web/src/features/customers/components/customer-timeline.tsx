'use client';

import * as React from 'react';
import type { CustomerDetail } from '@laam/types';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { getOrderStore } from '@/features/orders/data/mock-orders';
import { MOCK_FOLLOWUPS } from '@/features/followups/data/mock-followups';
import { filterTickets } from '@/features/support/data/mock-support';

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
  const items = React.useMemo(() => {
    const digits = phone.replace(/\D/g, '');
    const timeline: TimelineItem[] = activities.map((a) => ({
      id: a.id,
      label: a.label,
      description: a.description,
      timestamp: a.timestamp,
      kind: 'activity' as const,
    }));

    for (const order of getOrderStore()) {
      if (order.customerPhone.replace(/\D/g, '') !== digits) continue;
      timeline.push({
        id: `ord-${order.id}`,
        label: `Order ${order.orderNumber}`,
        description: `${order.status} · ${order.amount}`,
        timestamp: order.createdAt,
        kind: 'order',
      });
    }

    for (const f of MOCK_FOLLOWUPS) {
      if (f.phone.replace(/\D/g, '') !== digits) continue;
      timeline.push({
        id: `fu-${f.id}`,
        label: 'Follow-up',
        description: f.followupNotes ?? f.followupStatus,
        timestamp: f.createdAt,
        kind: 'followup',
      });
    }

    const tickets = filterTickets({ search: phone, page: 1, pageSize: 20 }).items;
    for (const t of tickets) {
      if (t.customerMobile.replace(/\D/g, '') !== digits) continue;
      timeline.push({
        id: `tk-${t.id}`,
        label: `Ticket: ${t.subject}`,
        description: t.status,
        timestamp: t.createdAt,
        kind: 'ticket',
      });
    }

    return timeline.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [phone, activities]);

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">Timeline</CardTitle>
      </CardHeader>
      <CardContent className={ORDER_SECTION_BODY_CLASS}>
        {!items.length ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="space-y-3 text-sm">
            {items.slice(0, 20).map((item) => (
              <li key={item.id}>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.label}</p>
                  <Badge variant="outline" className="text-[10px]">{item.kind}</Badge>
                </div>
                {item.description ? (
                  <p className="text-muted-foreground">{item.description}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {new Date(item.timestamp).toLocaleString('en-GB')}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
