'use client';

import * as React from 'react';
import type { LeadStatus } from '@laam/types';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LEAD_STATUS_LABELS } from '@/features/leads/config/lead-filters';

const STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost'];

type LeadStatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: LeadStatus;
  onSelect: (status: LeadStatus) => void | Promise<void>;
};

export function LeadStatusDialog({
  open,
  onOpenChange,
  currentStatus,
  onSelect,
}: LeadStatusDialogProps) {
  const [status, setStatus] = React.useState<LeadStatus>(currentStatus);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setStatus(currentStatus);
  }, [open, currentStatus]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSelect(status);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change lead status</DialogTitle>
        </DialogHeader>
        <FormField label="Status">
          <FormSearchSelect
            value={status}
            onChange={(value) => setStatus(value as LeadStatus)}
            options={STATUSES.map((item) => ({
              value: item,
              label: LEAD_STATUS_LABELS[item],
            }))}
            searchable={false}
          />
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
