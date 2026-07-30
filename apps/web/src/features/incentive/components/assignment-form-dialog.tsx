'use client';

import * as React from 'react';
import type { IncentivePlan, TenantUser } from '@laam/types';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { incentiveApi } from '@/features/incentive/api/incentive-api';
import { rbacApi } from '@/features/rbac/api/rbac-api';

export function AssignmentFormDialog({
  open,
  onClose,
  onSaved,
  plans,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  plans: IncentivePlan[];
}) {
  const [users, setUsers] = React.useState<TenantUser[]>([]);
  const [userId, setUserId] = React.useState('');
  const [planId, setPlanId] = React.useState('');
  const [shift, setShift] = React.useState('');
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setUserId('');
    setPlanId('');
    setShift('');
    let cancelled = false;
    setLoadingUsers(true);
    void rbacApi
      .listUsers('')
      .then((list) => {
        if (!cancelled) setUsers(list.filter((user) => user.status === 'active'));
      })
      .catch(() => {
        if (!cancelled) {
          setUsers([]);
          toast.error('Could not load active team members');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSubmit() {
    const user = users.find((item) => item.id === userId);
    if (!user || !planId) {
      toast.error('Select an agent and a plan');
      return;
    }
    setSaving(true);
    try {
      await incentiveApi.createAssignment({
        planId,
        userId: user.id,
        agentName: user.name,
        shift: shift || null,
      });
      toast.success('Agent assigned');
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not assign agent');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign agent to plan</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Agent" required>
            <FormSearchSelect
              value={userId}
              onChange={setUserId}
              options={users.map((user) => ({
                value: user.id,
                label: user.email ? `${user.name} · ${user.email}` : user.name,
              }))}
              placeholder={loadingUsers ? 'Loading…' : 'Search active team member'}
              disabled={loadingUsers}
            />
          </FormField>
          <FormField label="Plan" required>
            <FormSearchSelect
              value={planId}
              onChange={setPlanId}
              options={plans.map((plan) => ({
                value: plan.id,
                label: plan.teamName ? `${plan.name} · ${plan.teamName}` : plan.name,
              }))}
              placeholder="Select plan"
            />
          </FormField>
          <FormField label="Shift">
            <FormSearchSelect
              value={shift}
              onChange={setShift}
              options={[
                { value: '', label: 'No shift' },
                { value: 'morning', label: 'Morning' },
                { value: 'evening', label: 'Evening' },
                { value: 'night', label: 'Night' },
              ]}
              searchable={false}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || loadingUsers}
            onClick={() => void handleSubmit()}
          >
            {saving ? 'Assigning…' : 'Assign agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
