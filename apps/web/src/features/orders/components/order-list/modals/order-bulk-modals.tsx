'use client';

import * as React from 'react';
import type { BulkActionId, OrgTeam, OrderListRow, TenantUser } from '@laam/types';
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
import { FulfillmentWarehouseSelect } from '@/features/orders/components/shared/fulfillment-warehouse-select';
import { exportOrdersTable } from '@/features/orders/lib/export-orders-csv';
import { useOrderMutations } from '@/features/orders/hooks/use-order-mutations';
import { OrderStatusDialog } from '@/features/orders/components/shared/order-status-dialog';
import { orderSmsApi, smsSettingsApi } from '@/features/settings/api/sms-settings-api';
import { rbacApi } from '@/features/rbac/api/rbac-api';
import { ordersApi } from '@/features/orders/api/orders-api';

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
  const { bulkAction, bulkSetFollowUp, isLoading } = useOrderMutations();
  const [smsTemplates, setSmsTemplates] = React.useState<
    Array<{ id: string; label: string; message: string }>
  >([]);
  const [smsTemplate, setSmsTemplate] = React.useState('');
  const [smsMessage, setSmsMessage] = React.useState('');
  const [smsSending, setSmsSending] = React.useState(false);
  const [employee, setEmployee] = React.useState('');
  const [teamUsers, setTeamUsers] = React.useState<TenantUser[]>([]);
  const [teams, setTeams] = React.useState<OrgTeam[]>([]);
  const [followUpDate, setFollowUpDate] = React.useState('');
  const [courierWarehouseId, setCourierWarehouseId] = React.useState('');
  const [courierMode, setCourierMode] = React.useState<'auto_split' | 'specific_member'>('auto_split');
  const [courierTeamIds, setCourierTeamIds] = React.useState<string[]>([]);
  const [courierMemberId, setCourierMemberId] = React.useState('');

  React.useEffect(() => {
    if (state?.type === 'courier') {
      setCourierWarehouseId('');
      setCourierMemberId('');
    }
  }, [state]);

  React.useEffect(() => {
    if (state?.type !== 'transfer') return;
    let cancelled = false;
    void rbacApi
      .listUsers('')
      .then((list) => {
        if (!cancelled) setTeamUsers(list.filter((u) => u.status === 'active'));
      })
      .catch(() => {
        if (!cancelled) setTeamUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [state?.type]);

  React.useEffect(() => {
    if (state?.type !== 'courier') return;
    let cancelled = false;
    void Promise.all([rbacApi.listTeams(''), rbacApi.listUsers(''), ordersApi.getRoutingConfig()])
      .then(([orgTeams, users, cfg]) => {
        if (cancelled) return;
        setTeams(orgTeams);
        setTeamUsers(users.filter((u) => u.status === 'active'));
        setCourierMode(cfg.courierRouting.mode);
        setCourierTeamIds(cfg.courierRouting.teamIds);
        setCourierMemberId(cfg.courierRouting.assigneeUserId ?? '');
      })
      .catch(() => {
        if (cancelled) return;
        setTeams([]);
        setTeamUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [state?.type]);

  const courierMemberOptions = React.useMemo(() => {
    if (courierTeamIds.length === 0) return [];
    return teamUsers
      .filter((u) => u.teamId && courierTeamIds.includes(u.teamId))
      .map((u) => ({
        value: u.id,
        label: u.email ? `${u.name} · ${u.email}` : u.name,
      }));
  }, [courierTeamIds, teamUsers]);

  React.useEffect(() => {
    if (state?.type !== 'sms') return;
    let cancelled = false;
    void smsSettingsApi
      .listTemplates()
      .then((list) => {
        if (cancelled) return;
        const enabled = list.filter((t) => t.enabled);
        setSmsTemplates(enabled.map((t) => ({ id: t.id, label: t.label, message: t.message })));
        const first = enabled[0];
        if (first) {
          setSmsTemplate(first.id);
          setSmsMessage(first.message);
        }
      })
      .catch(() => {
        if (!cancelled) setSmsTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [state?.type]);

  React.useEffect(() => {
    if (state?.type === 'sms') {
      const template = smsTemplates.find((t) => t.id === smsTemplate);
      if (template) setSmsMessage(template.message ?? '');
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
    if (!smsMessage.trim()) {
      toast.error('Enter SMS message');
      return;
    }
    setSmsSending(true);
    try {
      const result = await orderSmsApi.bulk({
        orderIds: state.orderIds,
        message: smsMessage.trim(),
      });
      if (result.failedCount > 0) {
        toast.warning(
          `SMS: ${result.successCount} sent, ${result.failedCount} failed. Check Settings → SMS if all failed.`,
        );
      } else {
        toast.success(result.message || `SMS sent to ${result.successCount} order(s)`);
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bulk SMS failed');
    } finally {
      setSmsSending(false);
    }
  }

  async function handleStatusSubmit(
    nextStatus: string,
    meta?: { fulfillmentWarehouseId?: string; followUpDate?: string },
  ) {
    if (state?.type !== 'status') return;
    if (!nextStatus.trim()) {
      toast.error('Select a status');
      return;
    }
    await bulkAction({
      action: 'status_change',
      orderIds: state.orderIds,
      status: nextStatus.trim(),
      ...(meta?.fulfillmentWarehouseId
        ? { fulfillmentWarehouseId: meta.fulfillmentWarehouseId }
        : {}),
      ...(meta?.followUpDate ? { followUpDate: meta.followUpDate } : {}),
    });
    onSuccess?.();
    onClose();
  }

  async function handleCourierSubmit() {
    if (state?.type !== 'courier') return;
    const courier = state.courier.toLowerCase();
    if (courier !== 'pathao' && courier !== 'carrybee') {
      toast.error('Bulk submit supports Pathao and Carrybee only');
      return;
    }
    if (!courierWarehouseId.trim()) {
      toast.error('Select a fulfillment warehouse before booking courier');
      return;
    }
    try {
      await bulkAction({
        action: 'courier_submit',
        orderIds: state.orderIds,
        courier,
        fulfillmentWarehouseId: courierWarehouseId.trim(),
        assignmentMode: courierMode,
        routingTeamIds: courierTeamIds,
        routingUserId: courierMode === 'specific_member' ? courierMemberId : undefined,
      });
      onSuccess?.();
      onClose();
    } catch {
      // toast already shown by mutation hook
    }
  }

  async function handleTransferSubmit() {
    if (state?.type !== 'transfer') return;
    if (!employee) {
      toast.error('Select an employee');
      return;
    }
    const selected = teamUsers.find((u) => u.id === employee);
    if (!selected) {
      toast.error('Select an employee');
      return;
    }
    await bulkAction({
      action: 'transfer_employee',
      orderIds: state.orderIds,
      employeeName: selected.name,
      employeeUserId: selected.id,
    });
    onSuccess?.();
    onClose();
  }

  async function handleFollowUpSubmit() {
    if (state?.type !== 'followup') return;
    if (!followUpDate) {
      toast.error('Select a follow-up date');
      return;
    }
    await bulkSetFollowUp(state.orderIds, followUpDate);
    onSuccess?.();
    onClose();
  }

  function handleExport(format: 'csv' | 'excel') {
    if (state?.type !== 'export') return;
    if (selectedRows.length === 0) {
      toast.error('No row data available for export');
      return;
    }
    exportOrdersTable(selectedRows, format);
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
            <Button type="button" onClick={() => void handleSmsSubmit()} disabled={isLoading || smsSending}>
              {smsSending ? 'Sending…' : 'Send SMS'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrderStatusDialog
        open={state.type === 'status'}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        currentStatus=""
        allowSameStatus
        title={
          state.type === 'status'
            ? `Change status for ${state.orderIds.length} order${state.orderIds.length === 1 ? '' : 's'}`
            : 'Change status'
        }
        onSelect={handleStatusSubmit}
      />

      <Dialog open={state.type === 'courier'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit to {state.type === 'courier' ? state.courier : 'courier'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {state.type === 'courier'
                ? `${state.orderIds.length} order(s) will be submitted to ${state.courier} API.`
                : null}
            </p>
            <FulfillmentWarehouseSelect
              value={courierWarehouseId}
              onChange={setCourierWarehouseId}
              disabled={isLoading}
            />
            <FormField label="Routing mode">
              <FormSearchSelect
                value={courierMode}
                onChange={(v) =>
                  setCourierMode(v === 'specific_member' ? 'specific_member' : 'auto_split')
                }
                searchable={false}
                options={[
                  { value: 'auto_split', label: 'Auto split selected team members' },
                  { value: 'specific_member', label: 'Assign specific member' },
                ]}
              />
            </FormField>
            <FormField label="Team pool (one or more)">
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                {teams.map((team) => {
                  const checked = courierTeamIds.includes(team.id);
                  return (
                    <label
                      key={team.id}
                      className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={checked}
                        onChange={() =>
                          setCourierTeamIds((current) =>
                            checked
                              ? current.filter((id) => id !== team.id)
                              : [...current, team.id],
                          )
                        }
                      />
                      <span>{team.name}</span>
                    </label>
                  );
                })}
                {teams.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No teams found.</p>
                ) : null}
              </div>
            </FormField>
            {courierMode === 'specific_member' ? (
              <FormField label="Specific member">
                <FormSearchSelect
                  value={courierMemberId}
                  onChange={setCourierMemberId}
                  options={courierMemberOptions}
                  placeholder="Select member"
                />
              </FormField>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleCourierSubmit()}
              disabled={
                isLoading ||
                !courierWarehouseId.trim() ||
                courierTeamIds.length === 0 ||
                (courierMode === 'specific_member' && !courierMemberId)
              }
            >
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
              options={teamUsers.map((u) => ({
                value: u.id,
                label: u.email ? `${u.name} · ${u.email}` : u.name,
              }))}
              placeholder={teamUsers.length ? 'Search employee' : 'No team members'}
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
            Download CSV or Excel with order number, customer, amount, payment, and address for{' '}
            {state.type === 'export' ? state.orderIds.length : 0} selected order(s).
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={() => handleExport('csv')}>
              CSV
            </Button>
            <Button type="button" onClick={() => handleExport('excel')}>
              Excel
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
  if (actionId === 'submit_carrybee') return { type: 'courier', orderIds, courier: 'Carrybee' };
  return null;
}
