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
import {
  FulfillmentWarehouseSelect,
  STOCK_CUT_STATUS_SET,
} from '@/features/orders/components/shared/fulfillment-warehouse-select';
import { ordersApi } from '@/features/orders/api/orders-api';
import { ensureOrderStatusOnApi } from '@/features/orders/lib/ensure-order-status-api';
import { mergeStatusSelectOptions } from '@/features/orders/lib/order-status-hierarchy';
import { OrderDatePicker } from '@/features/orders/components/create-order/order-date-picker';

function toStatusSlug(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '');
}

function toStatusLabel(raw: string, slug: string) {
  const trimmed = raw.trim();
  if (trimmed && trimmed !== slug) return trimmed;
  return slug
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

type OrderStatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string;
  onSelect: (
    statusSlug: string,
    meta?: { fulfillmentWarehouseId?: string; followUpDate?: string },
  ) => void | Promise<void>;
  /** Override dialog title (e.g. bulk: "Change status for 10 orders"). */
  title?: string;
  /** When true, allow applying even if selected equals currentStatus (bulk / mixed). */
  allowSameStatus?: boolean;
  /** Prefill / require warehouse when moving into a stock-cut status. */
  fulfillmentWarehouseId?: string;
  /** When true, always show warehouse picker for stock-cut statuses. */
  requireWarehouseForStockCut?: boolean;
  /** When false, Hold does not prompt for a follow-up date (default: required everywhere). */
  enableHoldFollowUpDate?: boolean;
};

export function OrderStatusDialog({
  open,
  onOpenChange,
  currentStatus,
  onSelect,
  title = 'Change order status',
  allowSameStatus = false,
  fulfillmentWarehouseId,
  requireWarehouseForStockCut = true,
  enableHoldFollowUpDate = true,
}: OrderStatusDialogProps) {
  const [status, setStatus] = React.useState(currentStatus);
  const [warehouseId, setWarehouseId] = React.useState(fulfillmentWarehouseId ?? '');
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [holdFollowUpDate, setHoldFollowUpDate] = React.useState<Date | null>(null);
  const [statusOptions, setStatusOptions] = React.useState<Array<{ value: string; label: string }>>(
    [],
  );

  const needsWarehouse =
    requireWarehouseForStockCut && STOCK_CUT_STATUS_SET.has(status);
  const isHold = enableHoldFollowUpDate && status.trim().toLowerCase() === 'hold';

  React.useEffect(() => {
    if (!open) return;
    setStatus(currentStatus);
    setWarehouseId(fulfillmentWarehouseId ?? '');
    setHoldFollowUpDate(null);
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
  }, [open, currentStatus, fulfillmentWarehouseId]);

  React.useEffect(() => {
    if (isHold) {
      setHoldFollowUpDate((current) => current ?? new Date());
      return;
    }
    setHoldFollowUpDate(null);
  }, [isHold]);

  function toYmd(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const selected = statusOptions.find((option) => option.value === status);
      const slug = selected?.value ?? toStatusSlug(status);
      if (!slug || !/^[a-z][a-z0-9_]*$/.test(slug)) {
        toast.error('Enter a valid status (letters, numbers, underscore)');
        return;
      }
      if (needsWarehouse && !warehouseId.trim()) {
        toast.error('Select a fulfillment warehouse before confirming / cutting stock');
        return;
      }
      if (isHold && !holdFollowUpDate) {
        toast.error('Select a hold follow-up date');
        return;
      }
      const label = selected?.label ?? toStatusLabel(status, slug);
      if (process.env.NEXT_PUBLIC_USE_API === 'true') {
        await ensureOrderStatusOnApi({ value: slug, label });
      }
      await onSelect(
        slug,
        {
          ...(needsWarehouse ? { fulfillmentWarehouseId: warehouseId.trim() } : {}),
          ...(isHold && holdFollowUpDate ? { followUpDate: toYmd(holdFollowUpDate) } : {}),
        },
      );
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <FormField label="Status">
            <FormSearchSelect
              value={status}
              onChange={setStatus}
              options={statusOptions}
              placeholder={loading ? 'Loading…' : 'Search or type custom status'}
              searchPlaceholder="Search or create…"
              disabled={loading}
              allowCustom
              customOptionLabel={(query) => `Create “${query}”`}
            />
          </FormField>
          {needsWarehouse ? (
            <FulfillmentWarehouseSelect
              value={warehouseId}
              onChange={setWarehouseId}
              disabled={saving}
            />
          ) : null}
          {isHold ? (
            <OrderDatePicker
              label="Hold follow-up date"
              value={holdFollowUpDate ?? new Date()}
              onChange={setHoldFollowUpDate}
            />
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Type to create a custom status — it is registered to your org on update. Confirming cuts
          stock from the selected warehouse; moving back to Pending (or cancelling) restocks if
          stock was deducted.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              saving ||
              loading ||
              !status.trim() ||
              (!allowSameStatus && status === currentStatus) ||
              (needsWarehouse && !warehouseId.trim()) ||
              (isHold && !holdFollowUpDate)
            }
            onClick={() => void handleSave()}
          >
            Update status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
