'use client';

import type { OrderTimelineEvent } from '@laam/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';

type OrderTimelineProps = {
  events: OrderTimelineEvent[];
  title?: string;
};

export function OrderTimeline({ events, title = 'Activity timeline' }: OrderTimelineProps) {
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className={ORDER_SECTION_BODY_CLASS}>
        <ol className="space-y-4">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3 text-sm">
              <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="font-medium">{event.label}</p>
                {event.description ? (
                  <p className="text-muted-foreground">{event.description}</p>
                ) : null}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(event.timestamp))}
                  {event.actorName ? ` · ${event.actorName}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
