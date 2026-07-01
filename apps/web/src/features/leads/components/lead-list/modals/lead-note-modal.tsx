'use client';

import * as React from 'react';

import { FormField } from '@/components/form/form-field';
import { FormTextarea } from '@/components/form/form-textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type LeadNoteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadNumber: string;
  initialNote?: string;
  onSave: (note: string) => void | Promise<void>;
};

export function LeadNoteModal({
  open,
  onOpenChange,
  leadNumber,
  initialNote = '',
  onSave,
}: LeadNoteModalProps) {
  const [note, setNote] = React.useState(initialNote);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setNote(initialNote);
  }, [open, initialNote]);

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
          <DialogTitle>Notes — {leadNumber}</DialogTitle>
        </DialogHeader>
        <FormField label="Internal note">
          <FormTextarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
