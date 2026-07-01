'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { BulkActionId, OrderListRow } from '@laam/types';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { Button } from '@/components/ui/button';
import {
  BULK_ACTIONS_REGISTRY,
  resolveBulkActions,
} from '@/features/orders/config/bulk-actions-registry';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import {
  bulkActionToModal,
  OrderBulkModals,
} from '@/features/orders/components/order-list/modals/order-bulk-modals';
import { useOrderMutations } from '@/features/orders/hooks/use-order-mutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type OrderBulkActionsProps = {
  actionIds: BulkActionId[];
  selectedCount: number;
  selectedOrderIds: string[];
  selectedRows?: OrderListRow[];
  className?: string;
  onSuccess?: () => void;
  variant?: 'card' | 'compact';
};

const PRINT_ACTIONS = new Set<BulkActionId>(['print_selected', 'print_barcode', 'print_info']);

export function OrderBulkActions({
  actionIds,
  selectedCount,
  selectedOrderIds,
  selectedRows = [],
  className,
  onSuccess,
  variant = 'card',
}: OrderBulkActionsProps) {
  const router = useRouter();
  const actions = resolveBulkActions(actionIds);
  const visibleActions = actions.filter(
    (action) => !action.requiresSelection || selectedCount > 0,
  );
  const [bulkModal, setBulkModal] = React.useState<ReturnType<typeof bulkActionToModal>>(null);
  const { bulkAction, isLoading } = useOrderMutations();

  if (visibleActions.length === 0) {
    return null;
  }

  function handleAction(actionId: BulkActionId, label: string) {
    if (PRINT_ACTIONS.has(actionId)) {
      if (selectedCount === 0) {
        toast.error('Select at least one order');
        return;
      }
      const ids = selectedOrderIds.join(',');
      router.push(`/dashboard/orders/tools/bulk-print?ids=${encodeURIComponent(ids)}`);
      return;
    }

    const modal = bulkActionToModal(actionId, selectedOrderIds);
    if (modal) {
      if (selectedCount === 0) {
        toast.error('Select at least one order');
        return;
      }
      setBulkModal(modal);
      return;
    }

    void bulkAction({
      action: 'print',
      orderIds: selectedOrderIds,
    }).then(() => onSuccess?.());
  }

  const actionButtons = (
    <div className="flex flex-wrap gap-2">
      {visibleActions.map((action) => (
        <Button
          key={action.id}
          type="button"
          size="sm"
          variant={
            action.variant === 'destructive'
              ? 'destructive'
              : action.variant === 'secondary'
                ? 'secondary'
                : variant === 'compact'
                  ? 'outline'
                  : 'default'
          }
          disabled={(action.requiresSelection && selectedCount === 0) || isLoading}
          onClick={() => handleAction(action.id, BULK_ACTIONS_REGISTRY[action.id].label)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );

  if (variant === 'compact') {
    return (
      <>
        {actionButtons}
        <OrderBulkModals
          state={bulkModal}
          selectedRows={selectedRows}
          onClose={() => setBulkModal(null)}
          onSuccess={onSuccess}
        />
      </>
    );
  }

  return (
    <>
      <Card className={cn('gap-0 py-0 shadow-none', className)}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">
            Bulk actions
            {selectedCount > 0 ? (
              <span className="ml-2 font-normal text-muted-foreground">
                ({selectedCount} selected)
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
          {actionButtons}
          {selectedCount > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Quick transfer">
                <FormSearchSelect
                  value=""
                  onChange={(employee) => {
                    if (!employee) return;
                    void bulkAction({
                      action: 'transfer_employee',
                      orderIds: selectedOrderIds,
                      employeeName: employee,
                    }).then(() => onSuccess?.());
                  }}
                  options={['Sakib Ahmed', 'Mitu Rahman', 'Imran Hossain'].map((name) => ({
                    value: name,
                    label: name,
                  }))}
                  placeholder="Transfer to…"
                />
              </FormField>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <OrderBulkModals
        state={bulkModal}
        selectedRows={selectedRows}
        onClose={() => setBulkModal(null)}
        onSuccess={onSuccess}
      />
    </>
  );
}
