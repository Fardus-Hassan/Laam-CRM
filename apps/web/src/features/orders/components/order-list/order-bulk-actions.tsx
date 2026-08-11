'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { BulkActionId, OrderListRow, TenantUser } from '@laam/types';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
import {
  BULK_ACTIONS_REGISTRY,
  resolveBulkActions,
} from '@/features/orders/config/bulk-actions-registry';
import { useConnectedCouriers } from '@/features/courier/hooks/use-connected-couriers';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import {
  bulkActionToModal,
  OrderBulkModals,
} from '@/features/orders/components/order-list/modals/order-bulk-modals';
import { useOrderMutations } from '@/features/orders/hooks/use-order-mutations';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { rbacApi } from '@/features/rbac/api/rbac-api';
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

const PRINT_TYPE_BY_ACTION: Partial<Record<BulkActionId, 'invoice' | 'packing' | 'label' | 'barcode'>> = {
  print_selected: 'invoice',
  print_barcode: 'barcode',
  print_info: 'packing',
  print_info_2: 'label',
};

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
  const { can } = usePermissions();
  const { submitBulkActionIds } = useConnectedCouriers();
  const actionIdsWithCourier = React.useMemo(() => {
    const ids = [...actionIds];
    for (const id of submitBulkActionIds) {
      if (!ids.includes(id as BulkActionId)) {
        ids.push(id as BulkActionId);
      }
    }
    return ids;
  }, [actionIds, submitBulkActionIds]);
  const actions = resolveBulkActions(actionIdsWithCourier).filter((action) => {
    if (action.id === 'export' && !can('orders.export')) {
      return false;
    }
    if (action.id === 'submit_pathao' || action.id === 'submit_carrybee') {
      return submitBulkActionIds.has(action.id);
    }
    return true;
  });
  const visibleActions = actions.filter(
    (action) => !action.requiresSelection || selectedCount > 0,
  );
  const [bulkModal, setBulkModal] = React.useState<ReturnType<typeof bulkActionToModal>>(null);
  const { bulkAction, isLoading } = useOrderMutations();
  const [teamUsers, setTeamUsers] = React.useState<TenantUser[]>([]);
  const { confirm, confirmDialog } = useConfirmDialog();

  React.useEffect(() => {
    if (variant !== 'card' || selectedCount === 0) return;
    let cancelled = false;
    void rbacApi
      .listUsers('')
      .then((list) => {
        if (!cancelled) setTeamUsers(list.filter((u) => u.status === 'active'));
      })
      .catch(() => {
        if (!cancelled) setTeamUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [variant, selectedCount]);

  if (visibleActions.length === 0 && variant === 'compact') {
    return null;
  }

  async function handleAction(actionId: BulkActionId, label: string) {
    if (selectedCount === 0 && BULK_ACTIONS_REGISTRY[actionId]?.requiresSelection) {
      toast.error('Select at least one order');
      return;
    }

    const printType = PRINT_TYPE_BY_ACTION[actionId];
    if (printType) {
      const ids = selectedOrderIds.join(',');
      const params = new URLSearchParams({
        ids,
        type: printType,
        autoprint: '1',
      });
      router.push(`/dashboard/orders/tools/bulk-print?${params.toString()}`);
      return;
    }

    if (actionId === 'courier_cancel') {
      const ok = await confirm({
        title: `Cancel courier on ${selectedCount} order(s)?`,
        description:
          'This cancels the parcel at Pathao/Carrybee and clears the booking link. CRM orders stay open (In Courier → Confirmed).',
        confirmLabel: 'Cancel courier',
        destructive: true,
      });
      if (!ok) return;
      void bulkAction({
        action: 'courier_cancel',
        orderIds: selectedOrderIds,
      }).then(() => onSuccess?.());
      return;
    }

    if (actionId === 'courier_unlink') {
      const ok = await confirm({
        title: `Unlink courier on ${selectedCount} order(s)?`,
        description:
          'We will try to cancel each parcel at Pathao/Carrybee first. Prefer “Cancel Courier” when you want a normal cancel. Confirm only if parcels are already cancelled there — that acknowledges force-unlink when remote cancel fails.',
        confirmLabel: 'Cancel remotely / force unlink',
        destructive: true,
      });
      if (!ok) return;
      void bulkAction({
        action: 'courier_unlink',
        orderIds: selectedOrderIds,
        confirmRemoteCancelled: true,
      }).then(() => onSuccess?.());
      return;
    }

    if (actionId === 'update_courier_status') {
      void bulkAction({
        action: 'update_courier_status',
        orderIds: selectedOrderIds,
      }).then(() => onSuccess?.());
      return;
    }

    const modal = bulkActionToModal(actionId, selectedOrderIds);
    if (modal) {
      setBulkModal(modal);
      return;
    }

    // All BulkActionId values are handled above (print / courier / modal).
    // If this fires, a new registry id was added without a handler.
    console.error(`Unhandled bulk action: ${actionId}`);
    toast.error(`Could not run "${label}". Refresh and try again.`);
  }

  const transferOptions = teamUsers.map((u) => ({
    value: u.name,
    label: u.email ? `${u.name} · ${u.email}` : u.name,
  }));

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
          onClick={() => void handleAction(action.id, BULK_ACTIONS_REGISTRY[action.id].label)}
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
        {confirmDialog}
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
                    if (!employee || isLoading) return;
                    if (transferOptions.length === 0) {
                      toast.error('No active users found. Add team members in Settings → Users.');
                      return;
                    }
                    void bulkAction({
                      action: 'transfer_employee',
                      orderIds: selectedOrderIds,
                      employeeName: employee,
                    }).then(() => onSuccess?.());
                  }}
                  options={transferOptions}
                  placeholder={
                    transferOptions.length === 0 ? 'No active users' : 'Transfer to…'
                  }
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
      {confirmDialog}
    </>
  );
}
