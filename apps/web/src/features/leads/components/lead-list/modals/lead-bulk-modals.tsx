'use client';

import * as React from 'react';
import type { LeadStatus } from '@laam/types';
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
import type { LeadBulkActionId } from '@/features/leads/config/lead-bulk-actions';
import { LEAD_AGENTS } from '@/features/leads/data/mock-leads';
import { useLeadMutations } from '@/features/leads/hooks/use-lead-mutations';

type LeadBulkModalState =
  | { type: 'assign'; leadIds: string[] }
  | { type: 'transfer'; leadIds: string[] }
  | { type: 'followup'; leadIds: string[] }
  | { type: 'note'; leadIds: string[] }
  | { type: 'sms'; leadIds: string[] }
  | null;

export function bulkActionToModal(
  actionId: LeadBulkActionId,
  leadIds: string[],
): LeadBulkModalState {
  if (actionId === 'assign') return { type: 'assign', leadIds };
  if (actionId === 'transfer') return { type: 'transfer', leadIds };
  if (actionId === 'set_followup') return { type: 'followup', leadIds };
  if (actionId === 'add_note') return { type: 'note', leadIds };
  if (actionId === 'send_sms') return { type: 'sms', leadIds };
  return null;
}

type LeadBulkModalsProps = {
  state: LeadBulkModalState;
  onClose: () => void;
  onSuccess?: () => void;
};

export function LeadBulkModals({ state, onClose, onSuccess }: LeadBulkModalsProps) {
  const { bulkAction, isLoading } = useLeadMutations();
  const [employee, setEmployee] = React.useState('');
  const [followUpDate, setFollowUpDate] = React.useState('');
  const [note, setNote] = React.useState('');
  const [smsMessage, setSmsMessage] = React.useState('');

  if (!state) return null;

  async function handleAssign(type: 'assign' | 'transfer') {
    if ((state?.type !== 'assign' && state?.type !== 'transfer') || !employee) {
      toast.error('Select an agent');
      return;
    }
    await bulkAction({
      leadIds: state.leadIds,
      assignedAgentName: employee,
    });
    onSuccess?.();
    onClose();
  }

  async function handleFollowUp() {
    if (state?.type !== 'followup' || !followUpDate) {
      toast.error('Select a follow-up date');
      return;
    }
    await bulkAction({
      leadIds: state.leadIds,
      note: `Follow-up due: ${followUpDate}`,
      followUpDue: followUpDate,
    });
    onSuccess?.();
    onClose();
  }

  async function handleNote() {
    if (state?.type !== 'note' || !note.trim()) {
      toast.error('Enter a note');
      return;
    }
    await bulkAction({
      leadIds: state.leadIds,
      note: note.trim(),
    });
    onSuccess?.();
    onClose();
  }

  function handleSms() {
    if (state?.type !== 'sms') return;
    toast.success(`SMS queued for ${state.leadIds.length} lead(s) (mock)`);
    onClose();
  }

  return (
    <>
      <Dialog
        open={state.type === 'assign' || state.type === 'transfer'}
        onOpenChange={(open) => !open && onClose()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {state.type === 'transfer' ? 'Transfer' : 'Assign'} agent —{' '}
              {state.type === 'assign' || state.type === 'transfer' ? state.leadIds.length : 0}{' '}
              leads
            </DialogTitle>
          </DialogHeader>
          <FormField label="Agent">
            <FormSearchSelect
              value={employee}
              onChange={setEmployee}
              options={LEAD_AGENTS.map((name) => ({ value: name, label: name }))}
              placeholder="Select agent…"
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isLoading}
              onClick={() =>
                void handleAssign(state.type === 'transfer' ? 'transfer' : 'assign')
              }
            >
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

      <Dialog open={state.type === 'note'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add note to {state.type === 'note' ? state.leadIds.length : 0} leads</DialogTitle>
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

      <Dialog open={state.type === 'sms'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send SMS to {state.type === 'sms' ? state.leadIds.length : 0} leads</DialogTitle>
          </DialogHeader>
          <FormField label="Message">
            <FormTextarea
              rows={4}
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              placeholder="Hello {name}, thank you for your interest…"
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

export function runLeadBulkAction(
  actionId: LeadBulkActionId,
  leadIds: string[],
  handlers: {
    openModal: (modal: LeadBulkModalState) => void;
    bulkAction: (payload: {
      leadIds: string[];
      status?: LeadStatus;
      assignedAgentName?: string;
      note?: string;
      followUpDue?: string;
    }) => Promise<unknown>;
    exportRows: () => void;
  },
) {
  const modal = bulkActionToModal(actionId, leadIds);
  if (modal) {
    if (leadIds.length === 0) {
      toast.error('Select at least one lead');
      return;
    }
    handlers.openModal(modal);
    return;
  }

  if (actionId === 'export') {
    if (leadIds.length === 0) {
      toast.error('Select at least one lead');
      return;
    }
    handlers.exportRows();
    return;
  }

  if (actionId === 'confirm') {
    void handlers.bulkAction({ leadIds, status: 'qualified' });
    return;
  }

  if (actionId === 'mark_contacted') {
    void handlers.bulkAction({ leadIds, status: 'contacted' });
    return;
  }

  if (actionId === 'mark_qualified') {
    void handlers.bulkAction({ leadIds, status: 'qualified' });
    return;
  }

  if (actionId === 'mark_lost') {
    void handlers.bulkAction({ leadIds, status: 'lost' });
  }
}
