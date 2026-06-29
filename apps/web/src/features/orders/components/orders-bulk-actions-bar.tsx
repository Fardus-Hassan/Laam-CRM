'use client';

import { Button } from '@/components/ui/button';

const BULK_ACTIONS = [
  'Print Selected',
  'Print Barcode',
  'Print Info',
  'Export',
  'Send SMS',
  'Set Followup',
  'Transfer Selected',
  'Courier Unlink',
] as const;

type OrdersBulkActionsBarProps = {
  selectedCount?: number;
  showCourierSubmit?: boolean;
};

export function OrdersBulkActionsBar({
  selectedCount = 0,
  showCourierSubmit = false,
}: OrdersBulkActionsBarProps) {
  if (selectedCount === 0 && !showCourierSubmit) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
      <p className="mb-2 text-xs text-muted-foreground">
        {selectedCount > 0
          ? `${selectedCount} order(s) selected — bulk actions (prototype)`
          : 'Courier actions available on this queue'}
      </p>
      <div className="flex flex-wrap gap-2">
        {showCourierSubmit ? (
          <>
            <Button type="button" size="sm" variant="secondary" disabled>
              Submit Steadfast
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled>
              Submit Pathao
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled>
              Submit CarryBee
            </Button>
          </>
        ) : null}
        {BULK_ACTIONS.map((label) => (
          <Button key={label} type="button" size="sm" variant="outline" disabled>
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
