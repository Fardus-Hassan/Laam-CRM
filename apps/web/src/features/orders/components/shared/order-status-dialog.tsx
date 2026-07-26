'use client';

import * as React from 'react';
import { toast } from 'sonner';

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
import { ordersApi } from '@/features/orders/api/orders-api';
import { ensureOrderStatusOnApi } from '@/features/orders/lib/ensure-order-status-api';
import { mergeStatusSelectOptions } from '@/features/orders/lib/order-status-hierarchy';

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
  const [loading, setLoading] = React.useState(false);
  const [statusOptions, setStatusOptions] = React.useState<Array<{ value: string; label: string }>>(
    [],
  );

  React.useEffect(() => {
    if (!open) return;
    setStatus(currentStatus);
    let cancelled = false;
    setLoading(true);
    void ordersApi
      .getFormOptions()
      .then((options) => {
        if (cancelled) return;
        const next = mergeStatusSelectOptions(
          options.statuses.map((s) => ({ value: s.value, label: s.label })),
        );
        if (currentStatus && !next.some((s) => s.value === currentStatus)) {
          next.unshift({ value: currentStatus, label: currentStatus });
        }
        setStatusOptions(next);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load statuses');
          setStatusOptions(
            currentStatus ? [{ value: currentStatus, label: currentStatus }] : [],
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, currentStatus]);

  async function handleSave() {
    setSaving(true);
    try {
      const selected = statusOptions.find((option) => option.value === status);
      if (process.env.NEXT_PUBLIC_USE_API === 'true') {
        await ensureOrderStatusOnApi({
          value: status,
          label: selected?.label ?? status,
        });
      }
      await onSelect(status);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update status');
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
            placeholder={loading ? 'Loading…' : 'Search status'}
            disabled={loading}
          />
        </FormField>
        <p className="text-xs text-muted-foreground">
          Custom statuses are registered to your org on update. Confirming cuts stock; cancelling
          restocks if stock was deducted.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || loading || status === currentStatus}
            onClick={() => void handleSave()}
          >
            Update status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
