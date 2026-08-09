'use client';

import type { OrderTimelineEvent } from '@laam/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

type OrderTimelineProps = {
  events: OrderTimelineEvent[];
  title?: string;
  className?: string;
  /** Scrollable body (e.g. detail sidebar). */
  bodyClassName?: string;
};

export function OrderTimeline({
  events,
  title = 'Activity',
  className,
  bodyClassName,
}: OrderTimelineProps) {
  if (!events.length) {
    return (
      <Card className={cn('gap-0 py-0 shadow-none', className)}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className={ORDER_SECTION_BODY_CLASS}>
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('gap-0 py-0 shadow-none', className)}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className={cn(ORDER_SECTION_BODY_CLASS, bodyClassName)}>
        <ol className="relative space-y-0">
          {events.map((event, index) => {
            const isLast = index === events.length - 1;
            return (
              <li key={event.id} className="relative flex gap-3 pb-3 last:pb-0">
                {!isLast ? (
                  <span className="absolute top-2.5 left-[5px] h-[calc(100%-4px)] w-px bg-border" />
                ) : null}
                <span
                  className={cn(
                    'relative z-[1] mt-1 size-2.5 shrink-0 rounded-full border-2 border-background',
                    index === events.length - 1 ? 'bg-primary' : 'bg-muted-foreground/40',
                  )}
                />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium leading-snug">{event.label}</p>
                  {event.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDateTime(event.timestamp)}
                    {event.actorName ? ` · ${event.actorName}` : ''}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
