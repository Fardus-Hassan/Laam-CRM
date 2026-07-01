'use client';

import * as React from 'react';

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
import {
  getStatusConfigBySlug,
  MOCK_ORDER_STATUSES,
} from '@/features/orders/data/mock-status-config';

type OrderStatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string;
  onSelect: (statusSlug: string) => void | Promise<void>;
};

export function OrderStatusDialog({
  open,
  onOpenChange,
  currentStatus,
  onSelect,
}: OrderStatusDialogProps) {
  const [status, setStatus] = React.useState(currentStatus);
  const [saving, setSaving] = React.useState(false);

  const statusOptions = React.useMemo(() => {
    const current = getStatusConfigBySlug(currentStatus as never);
    const allowed = current?.allowedTransitions?.length
      ? MOCK_ORDER_STATUSES.filter(
          (item) =>
            item.slug === currentStatus ||
            current.allowedTransitions.includes(item.slug),
        )
      : MOCK_ORDER_STATUSES;
    return allowed.map((item) => ({ value: item.slug, label: item.label }));
  }, [currentStatus]);

  React.useEffect(() => {
    if (open) {
      setStatus(currentStatus);
    }
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
          <DialogTitle>Change order status</DialogTitle>
        </DialogHeader>
        <FormField label="Status">
          <FormSearchSelect
            value={status}
            onChange={setStatus}
            options={statusOptions}
            placeholder="Search status"
          />
        </FormField>
        <p className="text-xs text-muted-foreground">
          Only allowed transitions from the current status are shown.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving || status === currentStatus} onClick={() => void handleSave()}>
            Update status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
