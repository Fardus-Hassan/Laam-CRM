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
import type { FollowupBulkActionId } from '@/features/followups/config/followup-bulk-actions';
import {
  FOLLOWUP_STATUS_LABELS,
} from '@/features/followups/config/followup-filters';
import type { FollowupsApi } from '@/features/followups/api/followups-api';
import { CUSTOMER_AGENTS } from '@/features/customers/data/mock-customers';
import { useFollowupMutations } from '@/features/followups/hooks/use-followup-mutations';
import type { FollowupStatus } from '@laam/types';

type FollowupBulkModalState =
  | { type: 'sms'; followupIds: string[] }
  | { type: 'change_date'; followupIds: string[] }
  | { type: 'transfer'; followupIds: string[] }
  | { type: 'assign_tag'; followupIds: string[] }
  | { type: 'set_status'; followupIds: string[] }
  | null;

export function bulkActionToModal(
  actionId: FollowupBulkActionId,
  followupIds: string[],
): FollowupBulkModalState {
  if (actionId === 'send_sms') return { type: 'sms', followupIds };
  if (actionId === 'change_date') return { type: 'change_date', followupIds };
  if (actionId === 'transfer') return { type: 'transfer', followupIds };
  if (actionId === 'assign_tag') return { type: 'assign_tag', followupIds };
  if (actionId === 'set_status') return { type: 'set_status', followupIds };
  return null;
}

type FollowupBulkModalsProps = {
  state: FollowupBulkModalState;
  onClose: () => void;
  onSuccess?: () => void;
};

const STATUS_OPTIONS = (Object.keys(FOLLOWUP_STATUS_LABELS) as FollowupStatus[]).map(
  (value) => ({ value, label: FOLLOWUP_STATUS_LABELS[value] }),
);

const TAG_OPTIONS = [
  { value: 'VIP', label: 'VIP' },
  { value: 'Ramadan', label: 'Ramadan' },
  { value: 'Modhu', label: 'Modhu' },
  { value: 'Khejur', label: 'Khejur' },
  { value: 'Repeat', label: 'Repeat' },
];

export function FollowupBulkModals({ state, onClose, onSuccess }: FollowupBulkModalsProps) {
  const { bulkAction, isLoading } = useFollowupMutations();
  const [scheduleDate, setScheduleDate] = React.useState('');
  const [employee, setEmployee] = React.useState('');
  const [tag, setTag] = React.useState('');
  const [status, setStatus] = React.useState<FollowupStatus>('pending');
  const [smsMessage, setSmsMessage] = React.useState('');

  if (!state) return null;

  async function handleDate() {
    if (state?.type !== 'change_date' || !scheduleDate) {
      toast.error('Select a date');
      return;
    }
    await bulkAction({ followupIds: state.followupIds, scheduleDate });
    onSuccess?.();
    onClose();
  }

  async function handleTransfer() {
    if (state?.type !== 'transfer' || !employee) {
      toast.error('Select an agent');
      return;
    }
    await bulkAction({ followupIds: state.followupIds, assignedAgentName: employee });
    onSuccess?.();
    onClose();
  }

  async function handleTag() {
    if (state?.type !== 'assign_tag' || !tag) {
      toast.error('Select a tag');
      return;
    }
    await bulkAction({ followupIds: state.followupIds, tags: [tag] });
    onSuccess?.();
    onClose();
  }

  async function handleStatus() {
    if (state?.type !== 'set_status') return;
    await bulkAction({ followupIds: state.followupIds, followupStatus: status });
    onSuccess?.();
    onClose();
  }

  async function handleSms() {
    if (state?.type !== 'sms' || !smsMessage.trim()) {
      toast.error('Enter SMS message');
      return;
    }
    toast.success(`SMS queued for ${state.followupIds.length} follow-up(s)`);
    onSuccess?.();
    onClose();
  }

  if (state.type === 'change_date') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change follow-up date ({state.followupIds.length})</DialogTitle>
          </DialogHeader>
          <FormField label="Schedule date">
            <input
              type="date"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={isLoading} onClick={() => void handleDate()}>
              Update
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
            <DialogTitle>Transfer ({state.followupIds.length})</DialogTitle>
          </DialogHeader>
          <FormField label="Assign to">
            <FormSearchSelect
              value={employee}
              onChange={setEmployee}
              options={CUSTOMER_AGENTS.map((name) => ({ value: name, label: name }))}
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

  if (state.type === 'assign_tag') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign tag ({state.followupIds.length})</DialogTitle>
          </DialogHeader>
          <FormField label="Tag">
            <FormSearchSelect
              value={tag}
              onChange={setTag}
              options={TAG_OPTIONS}
              placeholder="Select tag…"
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={isLoading} onClick={() => void handleTag()}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (state.type === 'set_status') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set status ({state.followupIds.length})</DialogTitle>
          </DialogHeader>
          <FormField label="Follow-up status">
            <FormSearchSelect
              value={status}
              onChange={(v) => setStatus(v as FollowupStatus)}
              options={STATUS_OPTIONS}
              searchable={false}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={isLoading} onClick={() => void handleStatus()}>
              Update
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
          <DialogTitle>Send SMS ({state.followupIds.length})</DialogTitle>
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

export function runFollowupBulkAction(
  actionId: FollowupBulkActionId,
  followupIds: string[],
  handlers: {
    openModal: (state: FollowupBulkModalState) => void;
    bulkAction: (payload: Parameters<FollowupsApi['bulkAction']>[0]) => Promise<void>;
    exportRows: () => void;
  },
) {
  if (actionId === 'export') {
    handlers.exportRows();
    return;
  }
  const modal = bulkActionToModal(actionId, followupIds);
  if (modal) handlers.openModal(modal);
}
