'use client';

import * as React from 'react';
import type { BulkActionId } from '@laam/types';
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
import { MOCK_ORDER_STATUSES } from '@/features/orders/data/mock-status-config';
import { useOrderMutations } from '@/features/orders/hooks/use-order-mutations';

const SMS_TEMPLATES = [
  { id: 'confirm', label: 'Order confirmed', message: 'Your order has been confirmed. Thank you!' },
  { id: 'dispatch', label: 'Out for delivery', message: 'Your order is out for delivery today.' },
  { id: 'custom', label: 'Custom message', message: '' },
];

const EMPLOYEES = ['Sakib Ahmed', 'Mitu Rahman', 'Imran Hossain', 'Tania Sultana', 'Arif Mahmud'];

type BulkModalState =
  | { type: 'sms'; orderIds: string[] }
  | { type: 'status'; orderIds: string[] }
  | { type: 'courier'; orderIds: string[]; courier: string }
  | { type: 'transfer'; orderIds: string[] }
  | { type: 'export'; orderIds: string[] }
  | null;

type OrderBulkModalsProps = {
  state: BulkModalState;
  onClose: () => void;
  onSuccess?: () => void;
};

export function OrderBulkModals({ state, onClose, onSuccess }: OrderBulkModalsProps) {
  const { bulkAction, isLoading } = useOrderMutations();
  const [smsTemplate, setSmsTemplate] = React.useState('confirm');
  const [smsMessage, setSmsMessage] = React.useState(SMS_TEMPLATES[0].message);
  const [status, setStatus] = React.useState('confirmed');
  const [employee, setEmployee] = React.useState('');

  React.useEffect(() => {
    if (state?.type === 'sms') {
      const template = SMS_TEMPLATES.find((t) => t.id === smsTemplate);
      setSmsMessage(template?.message ?? '');
    }
  }, [smsTemplate, state?.type]);

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

  function handleExport() {
    if (state?.type !== 'export') return;
    const csv = `order_id,customer,amount\n${state.orderIds.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orders-export.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${state.orderIds.length} order(s)`);
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
                options={SMS_TEMPLATES.map((t) => ({ value: t.id, label: t.label }))}
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
            <Button type="button" onClick={handleSmsSubmit} disabled={isLoading}>
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
            <Button type="button" onClick={handleStatusSubmit} disabled={isLoading}>
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
            <Button type="button" onClick={handleCourierSubmit} disabled={isLoading}>
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
            <Button type="button" onClick={handleTransferSubmit} disabled={isLoading}>
              Transfer
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
            Download CSV for {state.type === 'export' ? state.orderIds.length : 0} selected order(s).
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
  if (actionId === 'submit_pathao') return { type: 'courier', orderIds, courier: 'Pathao' };
  if (actionId === 'submit_steadfast') return { type: 'courier', orderIds, courier: 'Steadfast' };
  if (actionId === 'submit_carrybee') return { type: 'courier', orderIds, courier: 'Carrybee' };
  return null;
}
