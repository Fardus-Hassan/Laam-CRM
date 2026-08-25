'use client';

import * as React from 'react';
import type {
  CreateIncentivePlanPayload,
  IncentiveMetricConfig,
  IncentiveMetricType,
  IncentivePlan,
  IncentiveTeam,
} from '@laam/types';
import { toast } from 'sonner';

import { Plus, Trash2 } from 'lucide-react';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
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
import { useOrderStatusConfig } from '@/features/orders/hooks/use-order-status-config';

const CORE_METRICS: Array<{ value: IncentiveMetricType; label: string }> = [
  { value: 'order_count', label: 'Order count' },
  { value: 'cross_sell_count', label: 'Cross-sell / upsell' },
  { value: 'return_ratio', label: 'Return ratio %' },
  { value: 'recovery_count', label: 'Recovery count' },
  { value: 'survey_count', label: 'Survey count' },
  { value: 'channel_activity', label: 'Channel activity' },
  { value: 'manual', label: 'Manual' },
];

type SlabDraft = {
  label: string;
  monthlyTarget: string;
  dailyTarget: string;
  incentiveBdt: string;
};

const EMPTY_SLAB: SlabDraft = {
  label: '',
  monthlyTarget: '',
  dailyTarget: '',
  incentiveBdt: '',
};

const DEFAULT_SLABS: SlabDraft[] = [
  { label: 'Starter', monthlyTarget: '208', dailyTarget: '8', incentiveBdt: '1000' },
  { label: 'Target', monthlyTarget: '260', dailyTarget: '', incentiveBdt: '3000' },
  { label: 'Top', monthlyTarget: '520', dailyTarget: '20', incentiveBdt: '7000' },
];

type Draft = {
  name: string;
  teamId: string;
  metricType: IncentiveMetricType;
  prorataAboveTop: boolean;
  teamMonthlyTarget: string;
  slabs: SlabDraft[];
  includeStatuses: string[];
  excludeStatuses: string[];
  deliveredStatuses: string[];
  returnedStatuses: string[];
  minItems: string;
  entryDailyTarget: string;
  maxAgentReturnRatioPct: string;
  channels: string[];
  recoveryFromStatuses: string[];
};

function toDraft(plan?: IncentivePlan | null): Draft {
  return {
    name: plan?.name ?? '',
    teamId: plan?.teamId ?? '',
    metricType: plan?.metricType ?? 'order_count',
    prorataAboveTop: true,
    teamMonthlyTarget:
      plan?.teamMonthlyTarget == null ? '' : String(plan.teamMonthlyTarget),
    slabs:
      plan?.slabs.length
        ? plan.slabs.map((slab) => ({
            label: slab.label ?? '',
            monthlyTarget: String(slab.monthlyTarget),
            dailyTarget: slab.dailyTarget == null ? '' : String(slab.dailyTarget),
            incentiveBdt: String(slab.incentiveBdt),
          }))
        : DEFAULT_SLABS,
    includeStatuses: plan?.metricConfig?.includeStatuses ?? [],
    excludeStatuses: plan?.metricConfig?.excludeStatuses ?? [],
    deliveredStatuses: plan?.metricConfig?.deliveredStatuses ?? [],
    returnedStatuses: plan?.metricConfig?.returnedStatuses ?? [],
    minItems: String(plan?.metricConfig?.minItems ?? 2),
    entryDailyTarget:
      plan?.metricConfig?.entryDailyTarget == null
        ? ''
        : String(plan.metricConfig.entryDailyTarget),
    maxAgentReturnRatioPct:
      plan?.metricConfig?.maxAgentReturnRatioPct == null
        ? ''
        : String(plan.metricConfig.maxAgentReturnRatioPct),
    channels: plan?.metricConfig?.channels ?? [],
    recoveryFromStatuses: plan?.metricConfig?.recoveryFromStatuses ?? [],
  };
}

function StatusChecks({
  values,
  onChange,
  statuses,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  statuses: Array<{ slug: string; label: string }>;
}) {
  return (
    <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-2">
      {statuses.map((status) => (
        <label key={status.slug} className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={values.includes(status.slug)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...values, status.slug]
                  : values.filter((value) => value !== status.slug),
              )
            }
          />
          {status.label}
        </label>
      ))}
    </div>
  );
}

export function PlanFormDialog({
  open,
  onClose,
  onSaved,
  initial,
  teams,
  lockedTeamId,
  occupiedMetrics = [],
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: IncentivePlan | null;
  teams: IncentiveTeam[];
  lockedTeamId?: string;
  occupiedMetrics?: IncentiveMetricType[];
}) {
  const { statuses } = useOrderStatusConfig();
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(initial));
  const [saving, setSaving] = React.useState(false);
  const editing = Boolean(initial);
  const metricOptions = CORE_METRICS.filter(
    (metric) =>
      metric.value === draft.metricType || !occupiedMetrics.includes(metric.value),
  );

  React.useEffect(() => {
    if (!open) return;
    const next = toDraft(initial);
    if (lockedTeamId) {
      next.teamId = lockedTeamId;
    }
    if (!initial) {
      const firstFree =
        CORE_METRICS.find((metric) => !occupiedMetrics.includes(metric.value)) ??
        CORE_METRICS[0]!;
      next.metricType = firstFree.value;
      const teamName = teams.find((team) => team.id === (lockedTeamId || next.teamId))?.name;
      next.name = teamName ? `${teamName} · ${firstFree.label}` : firstFree.label;
    }
    setDraft(next);
  }, [initial, open, lockedTeamId, teams, occupiedMetrics]);

  function patch(values: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...values }));
  }

  function patchSlab(index: number, values: Partial<SlabDraft>) {
    setDraft((current) => ({
      ...current,
      slabs: current.slabs.map((slab, i) => (i === index ? { ...slab, ...values } : slab)),
    }));
  }

  function addSlab() {
    setDraft((current) => ({ ...current, slabs: [...current.slabs, { ...EMPTY_SLAB }] }));
  }

  function removeSlab(index: number) {
    setDraft((current) => ({
      ...current,
      slabs: current.slabs.length <= 1 ? current.slabs : current.slabs.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit() {
    if (!draft.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    if (!draft.teamId) {
      toast.error('Pick a Users team for this KPI structure');
      return;
    }
    const slabs = draft.slabs
      .map((slab, sortOrder) => ({
        monthlyTarget: Number(slab.monthlyTarget),
        incentiveBdt: Number(slab.incentiveBdt),
        dailyTarget: slab.dailyTarget.trim() ? Number(slab.dailyTarget) : null,
        label: slab.label.trim() || null,
        sortOrder,
      }))
      .filter(
        (slab) =>
          Number.isFinite(slab.monthlyTarget) && Number.isFinite(slab.incentiveBdt),
      );
    if (!slabs.length) {
      toast.error('Add at least one slab with monthly target and incentive');
      return;
    }

    const metricConfig: IncentiveMetricConfig = {
      ...(draft.includeStatuses.length ? { includeStatuses: draft.includeStatuses } : {}),
      ...(draft.excludeStatuses.length ? { excludeStatuses: draft.excludeStatuses } : {}),
      ...(draft.metricType === 'cross_sell_count'
        ? { minItems: Math.max(1, Number(draft.minItems) || 2) }
        : {}),
      ...(draft.metricType === 'return_ratio'
        ? {
            direction: 'lower' as const,
            ...(draft.deliveredStatuses.length
              ? { deliveredStatuses: draft.deliveredStatuses }
              : {}),
            ...(draft.returnedStatuses.length
              ? { returnedStatuses: draft.returnedStatuses }
              : {}),
          }
        : {}),
      ...(draft.metricType === 'recovery_count'
        ? {
            ...(draft.recoveryFromStatuses.length
              ? { recoveryFromStatuses: draft.recoveryFromStatuses }
              : {}),
          }
        : {}),
      ...(draft.entryDailyTarget
        ? { entryDailyTarget: Number(draft.entryDailyTarget) }
        : {}),
      ...(draft.maxAgentReturnRatioPct
        ? { maxAgentReturnRatioPct: Number(draft.maxAgentReturnRatioPct) }
        : {}),
      ...(draft.metricType === 'channel_activity'
        ? { channels: draft.channels as IncentiveMetricConfig['channels'] }
        : {}),
    };
    const payload: CreateIncentivePlanPayload = {
      name: draft.name.trim(),
      teamId: draft.teamId || null,
      metricType: draft.metricType,
      metricConfig,
      // Always last-crossed-slab rate for extras (checkbox removed from UI).
      prorataAboveTop: true,
      teamMonthlyTarget: draft.teamMonthlyTarget
        ? Number(draft.teamMonthlyTarget)
        : null,
      slabs,
    };

    setSaving(true);
    try {
      if (initial) {
        await incentiveApi.updatePlan(initial.id, payload);
        toast.success('Plan updated');
      } else {
        await incentiveApi.createPlan(payload);
        toast.success('Plan created');
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save plan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Edit KPI structure' : 'Set KPI structure'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Name" required>
              <FormInput value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
            </FormField>
            <FormField label="Metric">
              <FormSearchSelect
                value={draft.metricType}
                onChange={(metricType) => {
                  const next = metricType as IncentiveMetricType;
                  const label = CORE_METRICS.find((metric) => metric.value === next)?.label;
                  const teamName = teams.find((team) => team.id === draft.teamId)?.name;
                  patch({
                    metricType: next,
                    ...(!editing && teamName && label
                      ? { name: `${teamName} · ${label}` }
                      : {}),
                  });
                }}
                options={metricOptions}
                searchable={false}
              />
            </FormField>
            <FormField label="Team monthly target" hint="Optional rollup target">
              <FormInput
                type="number"
                min={0}
                value={draft.teamMonthlyTarget}
                onChange={(e) => patch({ teamMonthlyTarget: e.target.value })}
              />
            </FormField>
          </div>
          {draft.metricType === 'cross_sell_count' ? (
            <FormField label="Minimum items per order">
              <FormInput
                type="number"
                min={1}
                value={draft.minItems}
                onChange={(e) => patch({ minItems: e.target.value })}
              />
            </FormField>
          ) : null}
          {draft.metricType === 'order_count' ||
          draft.metricType === 'cross_sell_count' ||
          draft.metricType === 'recovery_count' ? (
            <>
              {draft.metricType !== 'recovery_count' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Entry daily target" hint="Optional first-warning threshold">
                    <FormInput
                      type="number"
                      min={0}
                      value={draft.entryDailyTarget}
                      onChange={(e) => patch({ entryDailyTarget: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Maximum agent return ratio %" hint="Optional eligibility cap">
                    <FormInput
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.maxAgentReturnRatioPct}
                      onChange={(e) => patch({ maxAgentReturnRatioPct: e.target.value })}
                    />
                  </FormField>
                </div>
              ) : null}
              <FormField
                label={
                  draft.metricType === 'recovery_count'
                    ? 'Success statuses (recovered to)'
                    : 'Include order statuses'
                }
                hint="Leave all unchecked to use CRM defaults"
              >
                <StatusChecks
                  statuses={statuses}
                  values={draft.includeStatuses}
                  onChange={(includeStatuses) => patch({ includeStatuses })}
                />
              </FormField>
              {draft.metricType === 'recovery_count' ? (
                <FormField
                  label="Recovery-from statuses"
                  hint="Leave unchecked for pending / hold / incomplete defaults"
                >
                  <StatusChecks
                    statuses={statuses}
                    values={draft.recoveryFromStatuses}
                    onChange={(recoveryFromStatuses) => patch({ recoveryFromStatuses })}
                  />
                </FormField>
              ) : (
                <FormField label="Exclude order statuses">
                  <StatusChecks
                    statuses={statuses}
                    values={draft.excludeStatuses}
                    onChange={(excludeStatuses) => patch({ excludeStatuses })}
                  />
                </FormField>
              )}
            </>
          ) : null}
          {draft.metricType === 'return_ratio' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Delivered statuses" hint="Leave unchecked for defaults">
                <StatusChecks
                  statuses={statuses}
                  values={draft.deliveredStatuses}
                  onChange={(deliveredStatuses) => patch({ deliveredStatuses })}
                />
              </FormField>
              <FormField label="Returned statuses" hint="Leave unchecked for defaults">
                <StatusChecks
                  statuses={statuses}
                  values={draft.returnedStatuses}
                  onChange={(returnedStatuses) => patch({ returnedStatuses })}
                />
              </FormField>
            </div>
          ) : null}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Slabs</p>
              <Button type="button" size="sm" variant="outline" onClick={addSlab}>
                <Plus className="size-4" />
                Add slab
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Each row is one bonus level. Higher monthly target = higher incentive.
            </p>
            <div className="space-y-2">
              {draft.slabs.map((slab, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                >
                  <FormField label="Label">
                    <FormInput
                      placeholder="e.g. Starter"
                      value={slab.label}
                      onChange={(e) => patchSlab(index, { label: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Monthly target">
                    <FormInput
                      type="number"
                      min={0}
                      placeholder="260"
                      value={slab.monthlyTarget}
                      onChange={(e) => patchSlab(index, { monthlyTarget: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Daily target">
                    <FormInput
                      type="number"
                      min={0}
                      placeholder="Optional"
                      value={slab.dailyTarget}
                      onChange={(e) => patchSlab(index, { dailyTarget: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Incentive ৳">
                    <FormInput
                      type="number"
                      min={0}
                      placeholder="3000"
                      value={slab.incentiveBdt}
                      onChange={(e) => patchSlab(index, { incentiveBdt: e.target.value })}
                    />
                  </FormField>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={draft.slabs.length <= 1}
                      onClick={() => removeSlab(index)}
                      aria-label="Remove slab"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
