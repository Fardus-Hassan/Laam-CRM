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

type TaskNoteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialNote?: string;
  onSave: (note: string) => void | Promise<void>;
};

export function TaskNoteModal({
  open,
  onOpenChange,
  title,
  initialNote = '',
  onSave,
}: TaskNoteModalProps) {
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <FormField label="Note">
          <FormTextarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
