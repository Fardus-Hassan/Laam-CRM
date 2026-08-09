'use client';

import * as React from 'react';
import type { CustomerStatus, OrgCustomerStatus } from '@laam/types';

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
import { orgCustomerStatusesApi } from '@/features/settings/api/org-customer-statuses-api';
import { customerStatusLabel } from '@/features/customers/config/customer-segments';

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
  const [options, setOptions] = React.useState<OrgCustomerStatus[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setStatus(currentStatus);
  }, [open, currentStatus]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void orgCustomerStatusesApi.list().then((rows) => {
      if (!cancelled) setOptions(rows.filter((r) => r.isActive));
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSelect(status);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const selectOptions =
    options.length > 0
      ? options.map((item) => ({ value: item.slug, label: item.label }))
      : [{ value: currentStatus, label: customerStatusLabel(currentStatus) }];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customer status — {customerName}</DialogTitle>
        </DialogHeader>
        <FormField label="Status">
          <FormSearchSelect
            value={status}
            onChange={(value) => setStatus(value)}
            options={selectOptions}
            searchable
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
