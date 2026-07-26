'use client';

import * as React from 'react';
import type { OrderTimelineEvent } from '@laam/types';

import { FormField } from '@/components/form/form-field';
import { FormTextarea } from '@/components/form/form-textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ordersApi } from '@/features/orders/api/orders-api';
import { formatOrderDateTime } from '@/features/orders/components/order-list/order-table-columns';
import { cn } from '@/lib/utils';

type OrderNoteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  onSave: (note: string) => void | Promise<void>;
};

function isOrderNoteEvent(event: OrderTimelineEvent) {
  return event.type === 'note' && event.label === 'Note updated';
}

export function OrderNoteModal({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  onSave,
}: OrderNoteModalProps) {
  const [note, setNote] = React.useState('');
  const [history, setHistory] = React.useState<OrderTimelineEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !orderId) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void ordersApi
      .getOrder(orderNumber || orderId)
      .then((detail) => {
        if (cancelled) return;
        if (!detail) {
          setNote('');
          setHistory([]);
          setLoadError('Could not load notes');
          return;
        }
        setNote(detail.notes ?? '');
        setHistory(
          detail.timeline
            .filter(isOrderNoteEvent)
            .slice()
            .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load notes');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, orderId, orderNumber]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(note);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Order note — {orderNumber}</DialogTitle>
        </DialogHeader>

        <FormField label="Note">
          <FormTextarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Call before delivery, fragile items, etc."
            disabled={loading || saving}
          />
        </FormField>

        <div className="space-y-2">
          <p className="text-sm font-medium">Note history</p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border p-2">
              {history.map((event) => (
                <li
                  key={event.id}
                  className={cn('rounded-md bg-muted/40 px-2.5 py-2 text-sm')}
                >
                  <p className="whitespace-pre-wrap text-foreground">
                    {event.description?.trim() || '(cleared note)'}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatOrderDateTime(event.timestamp)}
                    {event.actorName ? ` · ${event.actorName}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading}>
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
