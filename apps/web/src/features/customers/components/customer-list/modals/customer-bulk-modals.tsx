'use client';

import * as React from 'react';
import type { CustomerStatus } from '@laam/types';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CustomerBulkActionId } from '@/features/customers/config/customer-bulk-actions';
import { useCustomerMutations } from '@/features/customers/hooks/use-customer-mutations';
import { followupsApi } from '@/features/followups/api/followups-api';
import { useAgentOptions } from '@/features/rbac/hooks/use-agent-options';

type CustomerBulkModalState =
  | { type: 'note'; customerIds: string[] }
  | { type: 'followup'; customerIds: string[] }
  | { type: 'transfer'; customerIds: string[] }
  | { type: 'sms'; customerIds: string[] }
  | null;

export function bulkActionToModal(
  actionId: CustomerBulkActionId,
  customerIds: string[],
): CustomerBulkModalState {
  if (actionId === 'add_note') return { type: 'note', customerIds };
  if (actionId === 'set_followup' || actionId === 'auto_followup') return { type: 'followup', customerIds };
  if (actionId === 'transfer') return { type: 'transfer', customerIds };
  if (actionId === 'send_sms') return { type: 'sms', customerIds };
  return null;
}

type CustomerBulkModalsProps = {
  state: CustomerBulkModalState;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CustomerBulkModals({ state, onClose, onSuccess }: CustomerBulkModalsProps) {
  const { bulkAction, isLoading } = useCustomerMutations();
  const { agents } = useAgentOptions();
  const [note, setNote] = React.useState('');
  const [followUpDate, setFollowUpDate] = React.useState('');
  const [employee, setEmployee] = React.useState('');
  const [smsMessage, setSmsMessage] = React.useState('');

  if (!state) return null;

  async function handleNote() {
    if (state?.type !== 'note' || !note.trim()) {
      toast.error('Enter a note');
      return;
    }
    await bulkAction({ customerIds: state.customerIds, note: note.trim() });
    onSuccess?.();
    onClose();
  }

  async function handleFollowUp() {
    if (state?.type !== 'followup' || !followUpDate) {
      toast.error('Select a follow-up date');
      return;
    }
    let ok = 0;
    let failed = 0;
    for (const customerId of state.customerIds) {
      try {
        await followupsApi.createFollowup({
          customerId,
          scheduleDate: followUpDate,
          note: `Bulk follow-up due: ${followUpDate}`,
        });
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    if (ok) toast.success(`Created ${ok} follow-up(s)`);
    if (failed) toast.error(`${failed} follow-up(s) failed`);
    onSuccess?.();
    onClose();
  }

  async function handleTransfer() {
    if (state?.type !== 'transfer' || !employee) {
      toast.error('Select an agent');
      return;
    }
    await bulkAction({ customerIds: state.customerIds, assignedAgentName: employee });
    onSuccess?.();
    onClose();
  }

  function handleSms() {
    if (state?.type !== 'sms') return;
    toast.message('Open SMS from customer detail or Marketing campaigns to send live messages.');
    onClose();
  }

  return (
    <>
      <Dialog open={state.type === 'note'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add note — {state.type === 'note' ? state.customerIds.length : 0} customers</DialogTitle>
          </DialogHeader>
          <FormField label="Note">
            <FormTextarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={isLoading} onClick={() => void handleNote()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={state.type === 'followup'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set follow-up</DialogTitle>
          </DialogHeader>
          <FormField label="Follow-up date">
            <input
              type="date"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={isLoading} onClick={() => void handleFollowUp()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={state.type === 'transfer'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer agent</DialogTitle>
          </DialogHeader>
          <FormField label="Agent">
            <FormSearchSelect
              value={employee}
              onChange={setEmployee}
              options={agents.map((name) => ({ value: name, label: name }))}
              placeholder="Select agent…"
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={isLoading} onClick={() => void handleTransfer()}>
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={state.type === 'sms'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send SMS</DialogTitle>
          </DialogHeader>
          <FormField label="Message">
            <FormTextarea
              rows={4}
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              placeholder="Assalamu Alaikum {name}, your modhu order…"
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSms}>
              Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function runCustomerBulkAction(
  actionId: CustomerBulkActionId,
  customerIds: string[],
  handlers: {
    openModal: (modal: CustomerBulkModalState) => void;
    bulkAction: (payload: {
      customerIds: string[];
      status?: CustomerStatus;
      note?: string;
      assignedAgentName?: string;
      followUpDue?: string;
    }) => Promise<unknown>;
    exportRows: () => void;
  },
) {
  if (customerIds.length === 0) {
    toast.error('Select at least one customer');
    return;
  }

  const modal = bulkActionToModal(actionId, customerIds);
  if (modal) {
    handlers.openModal(modal);
    return;
  }

  if (actionId === 'export') {
    handlers.exportRows();
    return;
  }

  if (actionId === 'delete') {
    toast.success(`Deleted ${customerIds.length} customer(s) (mock)`);
    return;
  }

  if (actionId === 'bulk_action') {
    void handlers.bulkAction({ customerIds, status: 'repeat' });
  }
}
