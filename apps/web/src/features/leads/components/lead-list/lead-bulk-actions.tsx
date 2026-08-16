'use client';

import * as React from 'react';
import type { LeadListItem } from '@laam/types';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  bulkActionToModal,
  LeadBulkModals,
  runLeadBulkAction,
} from '@/features/leads/components/lead-list/modals/lead-bulk-modals';
import {
  LEAD_BULK_ACTIONS,
  type LeadBulkActionId,
} from '@/features/leads/config/lead-bulk-actions';
import { useLeadMutations } from '@/features/leads/hooks/use-lead-mutations';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { downloadCsvAndExcel } from '@/lib/export-csv';
import { cn } from '@/lib/utils';

type LeadBulkActionsProps = {
  selectedCount: number;
  selectedLeadIds: string[];
  selectedRows: LeadListItem[];
  onSuccess?: () => void;
  className?: string;
};

export function LeadBulkActions({
  selectedCount,
  selectedLeadIds,
  selectedRows,
  onSuccess,
  className,
}: LeadBulkActionsProps) {
  const { can } = usePermissions();
  const { bulkAction, isLoading } = useLeadMutations();
  const [bulkModal, setBulkModal] = React.useState<ReturnType<typeof bulkActionToModal>>(null);
  const visibleActions = LEAD_BULK_ACTIONS.filter(
    (action) => !action.permission || can(action.permission),
  );

  function handleAction(actionId: LeadBulkActionId) {
    runLeadBulkAction(actionId, selectedLeadIds, {
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
          `leads-export-${Date.now()}`,
          ['Lead ID', 'Name', 'Phone', 'Status', 'Source', 'Agent', 'Value', 'Campaign'],
          selectedRows.map((row) => [
            row.leadNumber,
            row.name,
            row.phone,
            row.status,
            row.source,
            row.assignedAgentName ?? '',
            row.estimatedValue ?? '',
            row.campaignName ?? '',
          ]),
        );
        toast.success(`Exported ${selectedRows.length} lead(s) as CSV and Excel`);
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
      <LeadBulkModals
        state={bulkModal}
        onClose={() => setBulkModal(null)}
        onSuccess={onSuccess}
      />
    </>
  );
}
