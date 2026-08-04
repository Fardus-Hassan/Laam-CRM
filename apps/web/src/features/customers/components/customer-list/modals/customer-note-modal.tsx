'use client';

import * as React from 'react';
import type { CustomerDetail } from '@laam/types';

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
import { customersApi } from '@/features/customers/api/customers-api';
import { formatCustomerDateTime } from '@/features/customers/components/customer-list/customer-table-columns';
import { cn } from '@/lib/utils';

type CustomerNoteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  customerNumber?: string;
  onSave: (note: string) => void | Promise<void>;
};

function isCustomerNoteEvent(event: CustomerDetail['activities'][number]) {
  return event.label === 'Note updated';
}

export function CustomerNoteModal({
  open,
  onOpenChange,
  customerId,
  customerName,
  customerNumber,
  onSave,
}: CustomerNoteModalProps) {
  const [note, setNote] = React.useState('');
  const [history, setHistory] = React.useState<CustomerDetail['activities']>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !customerId) return;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void customersApi
      .getCustomer(customerId)
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
          detail.activities
            .filter(isCustomerNoteEvent)
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
  }, [open, customerId]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(note);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const titleSuffix = customerNumber || customerName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Customer note — {titleSuffix}</DialogTitle>
        </DialogHeader>

        <FormField label="Note">
          <FormTextarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Prefers evening call, COD notes, etc."
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
                    {formatCustomerDateTime(event.timestamp)}
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
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
