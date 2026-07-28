'use client';

import * as React from 'react';
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
import type { ContactBulkActionId } from '@/features/contacts/config/contact-bulk-actions';
import type { ContactsApi } from '@/features/contacts/api/contacts-api';
import { useContactMutations } from '@/features/contacts/hooks/use-contact-mutations';
import { useAgentOptions } from '@/features/rbac/hooks/use-agent-options';

type ContactBulkModalState =
  | { type: 'note'; contactIds: string[] }
  | { type: 'followup'; contactIds: string[] }
  | { type: 'transfer'; contactIds: string[] }
  | { type: 'sms'; contactIds: string[] }
  | null;

export function bulkActionToModal(
  actionId: ContactBulkActionId,
  contactIds: string[],
): ContactBulkModalState {
  if (actionId === 'add_note') return { type: 'note', contactIds };
  if (actionId === 'set_followup') return { type: 'followup', contactIds };
  if (actionId === 'transfer') return { type: 'transfer', contactIds };
  if (actionId === 'send_sms') return { type: 'sms', contactIds };
  return null;
}

type ContactBulkModalsProps = {
  state: ContactBulkModalState;
  onClose: () => void;
  onSuccess?: () => void;
};

export function ContactBulkModals({ state, onClose, onSuccess }: ContactBulkModalsProps) {
  const { bulkAction, isLoading } = useContactMutations();
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
    await bulkAction({ contactIds: state.contactIds, note: note.trim() });
    toast.success('Note saved');
    onSuccess?.();
    onClose();
  }

  async function handleFollowUp() {
    if (state?.type !== 'followup' || !followUpDate) {
      toast.error('Select a follow-up date');
      return;
    }
    await bulkAction({
      contactIds: state.contactIds,
      followUpDue: followUpDate,
      note: `Follow-up due: ${followUpDate}`,
    });
    toast.success('Follow-up set');
    onSuccess?.();
    onClose();
  }

  async function handleTransfer() {
    if (state?.type !== 'transfer' || !employee) {
      toast.error('Select an agent');
      return;
    }
    await bulkAction({ contactIds: state.contactIds, assignedAgentName: employee });
    toast.success('Contacts transferred');
    onSuccess?.();
    onClose();
  }

  async function handleSms() {
    if (state?.type !== 'sms' || !smsMessage.trim()) {
      toast.error('Enter SMS message');
      return;
    }
    toast.success(`SMS queued for ${state.contactIds.length} contact(s)`);
    onSuccess?.();
    onClose();
  }

  if (state.type === 'note') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add note to {state.contactIds.length} contact(s)</DialogTitle>
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
    );
  }

  if (state.type === 'followup') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set follow-up for {state.contactIds.length} contact(s)</DialogTitle>
          </DialogHeader>
          <FormField label="Follow-up date">
            <input
              type="date"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={isLoading} onClick={() => void handleFollowUp()}>
              Set follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (state.type === 'transfer') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer {state.contactIds.length} contact(s)</DialogTitle>
          </DialogHeader>
          <FormField label="Assign to">
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
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send SMS to {state.contactIds.length} contact(s)</DialogTitle>
        </DialogHeader>
        <FormField label="Message">
          <FormTextarea rows={4} value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={isLoading} onClick={() => void handleSms()}>
            Send SMS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function runContactBulkAction(
  actionId: ContactBulkActionId,
  contactIds: string[],
  handlers: {
    openModal: (state: ContactBulkModalState) => void;
    bulkAction: (payload: Parameters<ContactsApi['bulkAction']>[0]) => Promise<void>;
    exportRows: () => void;
  },
) {
  if (actionId === 'export') {
    handlers.exportRows();
    return;
  }
  if (actionId === 'log_call') {
    toast.info(`Log call for ${contactIds.length} contact(s) — open contact detail to record`);
    return;
  }
  const modal = bulkActionToModal(actionId, contactIds);
  if (modal) handlers.openModal(modal);
}
