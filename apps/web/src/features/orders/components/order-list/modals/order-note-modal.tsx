'use client';

import * as React from 'react';

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
type OrderNoteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  initialNote?: string;
  onSave: (note: string) => void | Promise<void>;
};

export function OrderNoteModal({
  open,
  onOpenChange,
  orderNumber,
  initialNote = '',
  onSave,
}: OrderNoteModalProps) {
  const [note, setNote] = React.useState(initialNote);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setNote(initialNote);
  }, [initialNote, open]);

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Order note — {orderNumber}</DialogTitle>
        </DialogHeader>
        <FormField label="Note">
          <FormTextarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Call before delivery, fragile items, etc."
          />
        </FormField>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
