'use client';

import type { OrderCourierTracking } from '@laam/types';
import { Truck } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

type CourierTrackingCardProps = {
  tracking: OrderCourierTracking;
  className?: string;
};

export function CourierTrackingCard({ tracking, className }: CourierTrackingCardProps) {
  return (
    <Card className={cn('gap-0 py-0 shadow-none', className)}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Truck className="size-4 text-primary" />
          Courier — {tracking.courierName}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
        <p className="text-sm">
          <span className="text-muted-foreground">Status: </span>
          <span className="font-medium">{tracking.currentStatus}</span>
        </p>
        {tracking.trackingId ? (
          <p className="text-xs text-muted-foreground">Tracking ID: {tracking.trackingId}</p>
        ) : null}
        <ol className="space-y-2">
          {tracking.steps.map((step, index) => (
            <li key={step.id} className="flex items-start gap-2 text-sm">
              <div
                className={cn(
                  'mt-1 size-2 shrink-0 rounded-full',
                  step.completed ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
              />
              <div>
                <p className={step.completed ? 'font-medium' : 'text-muted-foreground'}>
                  {step.label}
                </p>
                {step.timestamp ? (
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(step.timestamp))}
                  </p>
                ) : index === tracking.steps.findIndex((s) => !s.completed) ? (
                  <p className="text-xs text-primary">In progress</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
