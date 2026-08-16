'use client';

import * as React from 'react';
import type { CustomerListItem } from '@laam/types';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  bulkActionToModal,
  CustomerBulkModals,
  runCustomerBulkAction,
} from '@/features/customers/components/customer-list/modals/customer-bulk-modals';
import {
  CUSTOMER_BULK_ACTIONS,
  type CustomerBulkActionId,
} from '@/features/customers/config/customer-bulk-actions';
import { useCustomerMutations } from '@/features/customers/hooks/use-customer-mutations';
import { downloadCsvAndExcel } from '@/lib/export-csv';
import { cn } from '@/lib/utils';

type CustomerBulkActionsProps = {
  selectedCount: number;
  selectedCustomerIds: string[];
  selectedRows: CustomerListItem[];
  onSuccess?: () => void;
  className?: string;
};

export function CustomerBulkActions({
  selectedCount,
  selectedCustomerIds,
  selectedRows,
  onSuccess,
  className,
}: CustomerBulkActionsProps) {
  const { bulkAction, isLoading } = useCustomerMutations();
  const [bulkModal, setBulkModal] = React.useState<ReturnType<typeof bulkActionToModal>>(null);

  function handleAction(actionId: CustomerBulkActionId) {
    runCustomerBulkAction(actionId, selectedCustomerIds, {
      openModal: setBulkModal,
      bulkAction: async (payload) => {
        await bulkAction(payload);
        onSuccess?.();
      },
      exportRows: () => {
        if (selectedRows.length === 0) {
          toast.error('No rows to export');
          return;
        }
        downloadCsvAndExcel(
          `customers-export-${Date.now()}`,
          ['Customer ID', 'Name', 'Phone', 'Orders', 'Delivered', 'Courier Rate', 'Total Spent', 'Status', 'Tags'],
          selectedRows.map((row) => [
            row.customerNumber,
            row.name,
            row.phone,
            row.orderCount,
            row.deliveredCount,
            row.courierScore.rate,
            row.totalSpent,
            row.status,
            row.tags.join('; '),
          ]),
        );
        toast.success(`Exported ${selectedRows.length} customer(s) as CSV and Excel`);
        onSuccess?.();
      },
    });
  }

  return (
    <>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {CUSTOMER_BULK_ACTIONS.map((action) => (
          <Button
            key={action.id}
            type="button"
            size="sm"
            variant={
              action.variant === 'destructive'
                ? 'destructive'
                : action.variant === 'secondary'
                  ? 'secondary'
                  : 'outline'
            }
            disabled={(action.requiresSelection && selectedCount === 0) || isLoading}
            onClick={() => handleAction(action.id)}
          >
            {action.label}
          </Button>
        ))}
      </div>
      <CustomerBulkModals
        state={bulkModal}
        onClose={() => setBulkModal(null)}
        onSuccess={onSuccess}
      />
    </>
  );
}
