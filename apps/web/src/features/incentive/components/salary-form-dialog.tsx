'use client';

import * as React from 'react';
import type { IncentiveSalaryTemplate } from '@laam/types';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
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

const FIELDS = [
  ['basicBdt', 'Basic'],
  ['houseRentBdt', 'House rent'],
  ['medicalBdt', 'Medical'],
  ['conveyanceBdt', 'Conveyance'],
  ['grossBdt', 'Gross'],
  ['attendanceBonusBdt', 'Attendance bonus'],
  ['lunchBdt', 'Lunch & snacks'],
  ['totalBdt', 'Total'],
] as const;

type AmountKey = (typeof FIELDS)[number][0];
type Draft = Record<AmountKey, string> & { notes: string; payoutDay: string };

function toDraft(initial?: IncentiveSalaryTemplate | null): Draft {
  return {
    basicBdt: String(initial?.basicBdt ?? 0),
    houseRentBdt: String(initial?.houseRentBdt ?? 0),
    medicalBdt: String(initial?.medicalBdt ?? 0),
    conveyanceBdt: String(initial?.conveyanceBdt ?? 0),
    grossBdt: String(initial?.grossBdt ?? 0),
    attendanceBonusBdt: String(initial?.attendanceBonusBdt ?? 0),
    lunchBdt: String(initial?.lunchBdt ?? 0),
    totalBdt: String(initial?.totalBdt ?? 0),
    notes: initial?.notes ?? '',
    payoutDay: initial?.payoutDay == null ? '' : String(initial.payoutDay),
  };
}

export function SalaryFormDialog({
  open,
  onClose,
  onSaved,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: IncentiveSalaryTemplate | null;
}) {
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(initial));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setDraft(toDraft(initial));
  }, [initial, open]);

  async function handleSubmit() {
    const amounts = Object.fromEntries(
      FIELDS.map(([key]) => [key, Number(draft[key])]),
    ) as Record<AmountKey, number>;
    if (Object.values(amounts).some((amount) => !Number.isFinite(amount) || amount < 0)) {
      toast.error('Salary amounts must be valid positive numbers');
      return;
    }
    const payoutDayRaw = draft.payoutDay.trim();
    const payoutDay = payoutDayRaw ? Number(payoutDayRaw) : undefined;
    if (
      payoutDay != null &&
      (!Number.isInteger(payoutDay) || payoutDay < 1 || payoutDay > 28)
    ) {
      toast.error('Payout day must be between 1 and 28');
      return;
    }
    setSaving(true);
    try {
      await incentiveApi.upsertSalary({
        ...amounts,
        notes: draft.notes.trim() || undefined,
        ...(payoutDay != null ? { payoutDay } : {}),
      });
      toast.success('Salary reference saved');
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save salary');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit salary reference</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map(([key, label]) => (
            <FormField key={key} label={`${label} (BDT)`}>
              <FormInput
                type="number"
                min={0}
                value={draft[key]}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, [key]: e.target.value }))
                }
              />
            </FormField>
          ))}
          <FormField
            label="Payout day"
            hint="Day of next month shown on agent dashboard (1–28). Leave blank to hide."
          >
            <FormInput
              type="number"
              min={1}
              max={28}
              value={draft.payoutDay}
              onChange={(e) =>
                setDraft((current) => ({ ...current, payoutDay: e.target.value }))
              }
              placeholder="e.g. 5"
            />
          </FormField>
          <FormField label="Notes" className="sm:col-span-2">
            <FormTextarea
              rows={3}
              value={draft.notes}
              onChange={(e) =>
                setDraft((current) => ({ ...current, notes: e.target.value }))
              }
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
            {saving ? 'Saving…' : 'Save salary'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
