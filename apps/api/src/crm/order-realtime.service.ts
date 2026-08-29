import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, filter, map, merge, interval } from 'rxjs';

export type OrderRealtimeEvent = {
  type: 'orders_changed';
  organizationId: string;
  reason: 'created' | 'status' | 'updated';
  orderId?: string;
  status?: string;
  at: string;
};

/**
 * Org-scoped SSE bus for live order list / nav count updates.
 * Same process only (single API instance); scale-out can swap to Redis later.
 */
@Injectable()
export class OrderRealtimeService {
  private readonly bus = new Subject<OrderRealtimeEvent>();

  publish(
    organizationId: string,
    partial: Omit<OrderRealtimeEvent, 'type' | 'organizationId' | 'at'>,
  ): void {
    if (!organizationId) return;
    this.bus.next({
      type: 'orders_changed',
      organizationId,
      at: new Date().toISOString(),
      ...partial,
    });
  }

  watchOrganization(organizationId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let active = true;
      const send = (payload: Record<string, unknown>) => {
        if (!active) return;
        subscriber.next({ data: payload } as MessageEvent);
      };

      send({ type: 'connected', organizationId });

      const sub = merge(
        this.bus.pipe(
          filter((event) => event.organizationId === organizationId),
          map((event) => event as unknown as Record<string, unknown>),
        ),
        interval(25_000).pipe(map(() => ({ type: 'ping' as const }))),
      ).subscribe((payload) => send(payload));

      return () => {
        active = false;
        sub.unsubscribe();
      };
    });
  }
}
