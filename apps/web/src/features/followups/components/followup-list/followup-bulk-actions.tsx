'use client';

import * as React from 'react';
import type { FollowupListItem } from '@laam/types';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  bulkActionToModal,
  FollowupBulkModals,
  runFollowupBulkAction,
} from '@/features/followups/components/followup-list/modals/followup-bulk-modals';
import {
  FOLLOWUP_BULK_ACTIONS,
  type FollowupBulkActionId,
} from '@/features/followups/config/followup-bulk-actions';
import { useFollowupMutations } from '@/features/followups/hooks/use-followup-mutations';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { downloadCsvAndExcel } from '@/lib/export-csv';
import { cn } from '@/lib/utils';

type FollowupBulkActionsProps = {
  selectedCount: number;
  selectedFollowupIds: string[];
  selectedRows: FollowupListItem[];
  onSuccess?: () => void;
  className?: string;
};

export function FollowupBulkActions({
  selectedCount,
  selectedFollowupIds,
  selectedRows,
  onSuccess,
  className,
}: FollowupBulkActionsProps) {
  const { can } = usePermissions();
  const { bulkAction, isLoading } = useFollowupMutations();
  const [bulkModal, setBulkModal] = React.useState<ReturnType<typeof bulkActionToModal>>(null);
  const visibleActions = FOLLOWUP_BULK_ACTIONS.filter(
    (action) => !action.permission || can(action.permission),
  );

  function handleAction(actionId: FollowupBulkActionId) {
    runFollowupBulkAction(actionId, selectedFollowupIds, {
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
          `followups-export-${Date.now()}`,
          ['Customer ID', 'Name', 'Phone', 'Schedule', 'Status', 'Tag', 'SMS', 'Assigned', 'Product'],
          selectedRows.map((row) => [
            row.customerNumber,
            row.name,
            row.phone,
            row.scheduleDate ?? '',
            row.followupStatus,
            row.tags.join('; '),
            row.smsStatus,
            row.assignedAgentName ?? '',
            row.recentProducts[0]?.productName ?? '',
          ]),
        );
        toast.success(`Exported ${selectedRows.length} follow-up(s) as CSV and Excel`);
        onSuccess?.();
      },
    });
  }

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn('flex flex-wrap gap-2', className)}>
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
                  : 'outline'
            }
            disabled={(action.requiresSelection && selectedCount === 0) || isLoading}
            onClick={() => handleAction(action.id)}
          >
            {action.label}
          </Button>
        ))}
      </div>
      <FollowupBulkModals
        state={bulkModal}
        onClose={() => setBulkModal(null)}
        onSuccess={onSuccess}
      />
    </>
  );
}
