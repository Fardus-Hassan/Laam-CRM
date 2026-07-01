'use client';

import * as React from 'react';
import type { BulkActionId, OrderListRow } from '@laam/types';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
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
import { MOCK_ORDER_STATUSES } from '@/features/orders/data/mock-status-config';
import { loadSmsTemplates } from '@/features/orders/data/mock-sms-templates';
import { exportOrdersToCsv } from '@/features/orders/lib/export-orders-csv';
import { useOrderMutations } from '@/features/orders/hooks/use-order-mutations';

const EMPLOYEES = ['Sakib Ahmed', 'Mitu Rahman', 'Imran Hossain', 'Tania Sultana', 'Arif Mahmud'];

type BulkModalState =
  | { type: 'sms'; orderIds: string[] }
  | { type: 'status'; orderIds: string[] }
  | { type: 'courier'; orderIds: string[]; courier: string }
  | { type: 'transfer'; orderIds: string[] }
  | { type: 'export'; orderIds: string[] }
  | { type: 'followup'; orderIds: string[] }
  | null;

type OrderBulkModalsProps = {
  state: BulkModalState;
  selectedRows?: OrderListRow[];
  onClose: () => void;
  onSuccess?: () => void;
};

export function OrderBulkModals({ state, selectedRows = [], onClose, onSuccess }: OrderBulkModalsProps) {
  const { bulkAction, isLoading } = useOrderMutations();
  const smsTemplates = React.useMemo(() => loadSmsTemplates(), [state?.type]);
  const [smsTemplate, setSmsTemplate] = React.useState('confirm');
  const [smsMessage, setSmsMessage] = React.useState('');
  const [status, setStatus] = React.useState('confirmed');
  const [employee, setEmployee] = React.useState('');
  const [followUpDate, setFollowUpDate] = React.useState('');

  React.useEffect(() => {
    if (state?.type === 'sms') {
      const template = smsTemplates.find((t) => t.id === smsTemplate);
      setSmsMessage(template?.message ?? '');
    }
  }, [smsTemplate, smsTemplates, state?.type]);

  React.useEffect(() => {
    if (state?.type === 'followup' && !followUpDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFollowUpDate(tomorrow.toISOString().slice(0, 10));
    }
  }, [state?.type, followUpDate]);

  if (!state) {
    return null;
  }

  async function handleSmsSubmit() {
    if (state?.type !== 'sms') return;
    await bulkAction({
      action: 'sms',
      orderIds: state.orderIds,
      smsTemplateId: smsTemplate,
      smsMessage,
    });
    toast.success(`SMS queued for ${state.orderIds.length} order(s)`);
    onSuccess?.();
    onClose();
  }

  async function handleStatusSubmit() {
    if (state?.type !== 'status') return;
    await bulkAction({
      action: 'status_change',
      orderIds: state.orderIds,
      status: status as 'confirmed',
    });
    onSuccess?.();
    onClose();
  }

  async function handleCourierSubmit() {
    if (state?.type !== 'courier') return;
    await bulkAction({
      action: 'courier_submit',
      orderIds: state.orderIds,
      courier: state.courier,
    });
    onSuccess?.();
    onClose();
  }

  async function handleTransferSubmit() {
    if (state?.type !== 'transfer') return;
    if (!employee) {
      toast.error('Select an employee');
      return;
    }
    await bulkAction({
      action: 'transfer_employee',
      orderIds: state.orderIds,
      employeeName: employee,
    });
    onSuccess?.();
    onClose();
  }

  async function handleFollowUpSubmit() {
    if (state?.type !== 'followup') return;
    await bulkAction({
      action: 'status_change',
      orderIds: state.orderIds,
      status: 'hold_followup',
    });
    toast.success(`Follow-up set for ${followUpDate} on ${state.orderIds.length} order(s)`);
    onSuccess?.();
    onClose();
  }

  function handleExport() {
    if (state?.type !== 'export') return;
    if (selectedRows.length === 0) {
      toast.error('No row data available for export');
      return;
    }
    exportOrdersToCsv(selectedRows);
    toast.success(`Exported ${selectedRows.length} order(s)`);
    onClose();
  }

  return (
    <>
      <Dialog open={state.type === 'sms'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send SMS to {state.type === 'sms' ? state.orderIds.length : 0} orders</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Template">
              <FormSearchSelect
                value={smsTemplate}
                onChange={setSmsTemplate}
                options={smsTemplates.map((t) => ({ value: t.id, label: t.label }))}
                searchable={false}
              />
            </FormField>
            <FormField label="Message">
              <FormTextarea
                rows={4}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSmsSubmit()} disabled={isLoading}>
              Send SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={state.type === 'status'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
          </DialogHeader>
          <FormField label="New status">
            <FormSearchSelect
              value={status}
              onChange={setStatus}
              options={MOCK_ORDER_STATUSES.map((s) => ({ value: s.slug, label: s.label }))}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleStatusSubmit()} disabled={isLoading}>
              Update status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={state.type === 'courier'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit to {state.type === 'courier' ? state.courier : 'courier'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {state.type === 'courier'
              ? `${state.orderIds.length} order(s) will be submitted to ${state.courier} API.`
              : null}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCourierSubmit()} disabled={isLoading}>
              Confirm submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={state.type === 'transfer'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to employee</DialogTitle>
          </DialogHeader>
          <FormField label="Employee" required>
            <FormSearchSelect
              value={employee}
              onChange={setEmployee}
              options={EMPLOYEES.map((name) => ({ value: name, label: name }))}
              placeholder="Search employee"
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleTransferSubmit()} disabled={isLoading}>
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={state.type === 'followup'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set follow-up</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Move {state.type === 'followup' ? state.orderIds.length : 0} order(s) to Hold Followup and schedule callback.
          </p>
          <FormField label="Follow-up date">
            <FormInput
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleFollowUpSubmit()} disabled={isLoading}>
              Set follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={state.type === 'export'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export orders</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Download CSV with order number, customer, amount, payment, and address for{' '}
            {state.type === 'export' ? state.orderIds.length : 0} selected order(s).
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleExport}>
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function bulkActionToModal(
  actionId: BulkActionId,
  orderIds: string[],
): BulkModalState {
  if (actionId === 'send_sms') return { type: 'sms', orderIds };
  if (actionId === 'status_change') return { type: 'status', orderIds };
  if (actionId === 'transfer') return { type: 'transfer', orderIds };
  if (actionId === 'export') return { type: 'export', orderIds };
  if (actionId === 'set_followup') return { type: 'followup', orderIds };
  if (actionId === 'submit_pathao') return { type: 'courier', orderIds, courier: 'Pathao' };
  if (actionId === 'submit_steadfast') return { type: 'courier', orderIds, courier: 'Steadfast' };
  if (actionId === 'submit_carrybee') return { type: 'courier', orderIds, courier: 'Carrybee' };
  return null;
}
