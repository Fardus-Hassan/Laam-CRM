'use client';

import * as React from 'react';
import type { CustomerStatus } from '@laam/types';

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
import { CUSTOMER_STATUS_LABELS } from '@/features/customers/config/customer-segments';

const STATUSES = Object.keys(CUSTOMER_STATUS_LABELS) as CustomerStatus[];

type CustomerStatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  currentStatus: CustomerStatus;
  onSelect: (status: CustomerStatus) => void | Promise<void>;
};

export function CustomerStatusDialog({
  open,
  onOpenChange,
  customerName,
  currentStatus,
  onSelect,
}: CustomerStatusDialogProps) {
  const [status, setStatus] = React.useState<CustomerStatus>(currentStatus);
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
          <DialogTitle>Customer status — {customerName}</DialogTitle>
        </DialogHeader>
        <FormField label="Status">
          <FormSearchSelect
            value={status}
            onChange={(value) => setStatus(value as CustomerStatus)}
            options={STATUSES.map((item) => ({
              value: item,
              label: CUSTOMER_STATUS_LABELS[item],
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
