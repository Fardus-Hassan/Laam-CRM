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
import { incentiveApi } from '@/features/incentive/api/incentive-api';
import { useOrderStatusConfig } from '@/features/orders/hooks/use-order-status-config';

const METRICS: Array<{ value: IncentiveMetricType; label: string }> = [
  { value: 'order_count', label: 'Order count' },
  { value: 'cross_sell_count', label: 'Cross-sell count' },
  { value: 'return_ratio', label: 'Return ratio %' },
  { value: 'recovery_count', label: 'Recovery count' },
  { value: 'survey_count', label: 'Survey count' },
  { value: 'channel_activity', label: 'Channel activity' },
  { value: 'manual', label: 'Manual' },
];

const CHANNELS = [
  { slug: 'call', label: 'Call' },
  { slug: 'facebook_comment', label: 'Facebook comments' },
  { slug: 'messenger', label: 'Messenger' },
  { slug: 'whatsapp', label: 'WhatsApp' },
];

type Draft = {
  name: string;
  teamId: string;
  metricType: IncentiveMetricType;
  prorataAboveTop: boolean;
  teamMonthlyTarget: string;
  slabsText: string;
  includeStatuses: string[];
  excludeStatuses: string[];
  deliveredStatuses: string[];
  returnedStatuses: string[];
  minItems: string;
  entryDailyTarget: string;
  maxAgentReturnRatioPct: string;
  channels: string[];
};

function toDraft(plan?: IncentivePlan | null): Draft {
  return {
    name: plan?.name ?? '',
    teamId: plan?.teamId ?? '',
    metricType: plan?.metricType ?? 'order_count',
    prorataAboveTop: plan?.prorataAboveTop ?? false,
    teamMonthlyTarget:
      plan?.teamMonthlyTarget == null ? '' : String(plan.teamMonthlyTarget),
    slabsText:
      plan?.slabs
        .map((slab) =>
          [
            slab.monthlyTarget,
            slab.incentiveBdt,
            slab.dailyTarget ?? '',
            slab.label ?? '',
          ].join(','),
        )
        .join('\n') ?? '208,1000,8,Starter\n260,3000,,Target\n520,7000,20,Top',
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
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: IncentivePlan | null;
  teams: IncentiveTeam[];
}) {
  const { statuses } = useOrderStatusConfig();
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(initial));
  const [saving, setSaving] = React.useState(false);
  const editing = Boolean(initial);

  React.useEffect(() => {
    if (open) setDraft(toDraft(initial));
  }, [initial, open]);

  function patch(values: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...values }));
  }

  async function handleSubmit() {
    if (!draft.name.trim()) {
      toast.error('Plan name is required');
      return;
    }
    const slabs = draft.slabsText
      .split('\n')
      .map((line, sortOrder) => {
        const [monthly, incentive, daily, label] = line.split(',').map((part) => part.trim());
        return {
          monthlyTarget: Number(monthly),
          incentiveBdt: Number(incentive),
          dailyTarget: daily ? Number(daily) : null,
          label: label || null,
          sortOrder,
        };
      })
      .filter(
        (slab) =>
          Number.isFinite(slab.monthlyTarget) && Number.isFinite(slab.incentiveBdt),
      );
    if (draft.slabsText.trim() && !slabs.length) {
      toast.error('Enter valid slabs, one per line');
      return;
    }

    const metricConfig: IncentiveMetricConfig = {
      includeStatuses: draft.includeStatuses,
      excludeStatuses: draft.excludeStatuses,
      ...(draft.metricType === 'cross_sell_count'
        ? { minItems: Math.max(1, Number(draft.minItems) || 2) }
        : {}),
      ...(draft.metricType === 'return_ratio'
        ? {
            direction: 'lower' as const,
            deliveredStatuses: draft.deliveredStatuses,
            returnedStatuses: draft.returnedStatuses,
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
      prorataAboveTop: draft.prorataAboveTop,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit incentive plan' : 'New incentive plan'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Name" required>
              <FormInput value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
            </FormField>
            <FormField label="Team">
              <FormSearchSelect
                value={draft.teamId}
                onChange={(teamId) => patch({ teamId })}
                options={[
                  { value: '', label: 'No team' },
                  ...teams.map((team) => ({ value: team.id, label: team.name })),
                ]}
                searchable={false}
              />
            </FormField>
            <FormField label="Metric">
              <FormSearchSelect
                value={draft.metricType}
                onChange={(metricType) =>
                  patch({ metricType: metricType as IncentiveMetricType })
                }
                options={METRICS}
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
          {draft.metricType === 'channel_activity' ? (
            <FormField label="Included channels">
              <StatusChecks
                statuses={CHANNELS}
                values={draft.channels}
                onChange={(channels) => patch({ channels })}
              />
            </FormField>
          ) : null}
          <FormField label="Include order statuses">
            <StatusChecks
              statuses={statuses}
              values={draft.includeStatuses}
              onChange={(includeStatuses) => patch({ includeStatuses })}
            />
          </FormField>
          <FormField label="Exclude order statuses">
            <StatusChecks
              statuses={statuses}
              values={draft.excludeStatuses}
              onChange={(excludeStatuses) => patch({ excludeStatuses })}
            />
          </FormField>
          {draft.metricType === 'return_ratio' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Delivered statuses">
                <StatusChecks
                  statuses={statuses}
                  values={draft.deliveredStatuses}
                  onChange={(deliveredStatuses) => patch({ deliveredStatuses })}
                />
              </FormField>
              <FormField label="Returned statuses">
                <StatusChecks
                  statuses={statuses}
                  values={draft.returnedStatuses}
                  onChange={(returnedStatuses) => patch({ returnedStatuses })}
                />
              </FormField>
            </div>
          ) : null}
          <FormField
            label="Slabs"
            hint="monthly target, incentive BDT, daily target (optional), label (optional)"
          >
            <FormTextarea
              rows={5}
              value={draft.slabsText}
              onChange={(e) => patch({ slabsText: e.target.value })}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.prorataAboveTop}
              onChange={(e) => patch({ prorataAboveTop: e.target.checked })}
            />
            Prorata payout above the top slab
          </label>
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
