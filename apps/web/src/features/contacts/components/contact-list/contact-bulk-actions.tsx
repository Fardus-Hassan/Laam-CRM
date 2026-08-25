'use client';

import * as React from 'react';
import type { ContactListItem } from '@laam/types';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  bulkActionToModal,
  ContactBulkModals,
  runContactBulkAction,
} from '@/features/contacts/components/contact-list/modals/contact-bulk-modals';
import {
  CONTACT_BULK_ACTIONS,
  type ContactBulkActionId,
} from '@/features/contacts/config/contact-bulk-actions';
import { useContactMutations } from '@/features/contacts/hooks/use-contact-mutations';
import { downloadCsvAndExcel } from '@/lib/export-csv';
import { cn } from '@/lib/utils';

type ContactBulkActionsProps = {
  selectedCount: number;
  selectedContactIds: string[];
  selectedRows: ContactListItem[];
  onSuccess?: () => void;
  className?: string;
};

export function ContactBulkActions({
  selectedCount,
  selectedContactIds,
  selectedRows,
  onSuccess,
  className,
}: ContactBulkActionsProps) {
  const { bulkAction, isLoading } = useContactMutations();
  const [bulkModal, setBulkModal] = React.useState<ReturnType<typeof bulkActionToModal>>(null);

  function handleAction(actionId: ContactBulkActionId) {
    runContactBulkAction(actionId, selectedContactIds, {
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
          `contacts-export-${Date.now()}`,
          ['ID', 'Name', 'Phone', 'Type', 'Organization', 'Orders', 'Courier Rate', 'Source', 'Tags'],
          selectedRows.map((row) => [
            row.contactNumber ?? row.id,
            row.name,
            row.phone,
            row.contactType,
            row.organizationName ?? '',
            row.orderCount ?? '',
            row.courierScore?.rate ?? '',
            row.source,
            row.tags.join('; '),
          ]),
        );
        toast.success(`Exported ${selectedRows.length} contact(s) as CSV and Excel`);
        onSuccess?.();
      },
    });
  }

  return (
    <>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {CONTACT_BULK_ACTIONS.map((action) => (
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
      <ContactBulkModals
        state={bulkModal}
        onClose={() => setBulkModal(null)}
        onSuccess={onSuccess}
      />
    </>
  );
}
