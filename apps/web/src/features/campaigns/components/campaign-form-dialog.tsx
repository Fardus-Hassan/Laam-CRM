'use client';

import * as React from 'react';
import type {
  Campaign,
  CampaignPlatform,
  CampaignStatus,
  CreateCampaignPayload,
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
import { campaignsApi } from '@/features/campaigns/api/campaigns-api';

const STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Ended' },
];

const PLATFORM_OPTIONS: { value: CampaignPlatform; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google' },
];

type CampaignFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: Campaign | null;
};

type Draft = {
  name: string;
  status: CampaignStatus;
  platform: CampaignPlatform;
  budgetBdt: string;
  startDate: string;
  endDate: string;
  notes: string;
  landingPageName: string;
  landingPageUrl: string;
};

function toDraft(initial?: Campaign | null): Draft {
  return {
    name: initial?.name ?? '',
    status: initial?.status ?? 'active',
    platform: initial?.platform ?? 'facebook',
    budgetBdt: initial ? String(initial.budgetBdt) : '',
    startDate: initial?.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: initial?.endDate ?? '',
    notes: initial?.notes ?? '',
    landingPageName: initial?.landingPageName ?? '',
    landingPageUrl: initial?.landingPageUrl ?? '',
  };
}

export function CampaignFormDialog({
  open,
  onClose,
  onSaved,
  initial,
}: CampaignFormDialogProps) {
  const editing = Boolean(initial);
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(initial));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setDraft(toDraft(initial));
  }, [open, initial]);

  function patch(values: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...values }));
  }

  async function handleSubmit() {
    const name = draft.name.trim();
    if (!name) {
      toast.error('Campaign name is required');
      return;
    }
    const budgetBdt = Number(draft.budgetBdt || 0);
    if (Number.isNaN(budgetBdt) || budgetBdt < 0) {
      toast.error('Budget must be a valid number');
      return;
    }

    const payload: CreateCampaignPayload = {
      name,
      status: draft.status,
      platform: draft.platform,
      budgetBdt,
      startDate: draft.startDate || undefined,
      endDate: draft.endDate || null,
      notes: draft.notes.trim() || null,
      landingPageName: draft.landingPageName.trim() || null,
      landingPageUrl: draft.landingPageUrl.trim() || null,
    };

    setSaving(true);
    try {
      if (editing && initial) {
        await campaignsApi.updateCampaign(initial.id, payload);
        toast.success('Campaign updated');
      } else {
        await campaignsApi.createCampaign(payload);
        toast.success('Campaign created');
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit campaign' : 'New campaign'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <FormField label="Name" required>
            <FormInput
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="e.g. Ramadan Modhu Boost"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Status">
              <FormSearchSelect
                value={draft.status}
                onChange={(v) => patch({ status: v as CampaignStatus })}
                options={STATUS_OPTIONS}
                searchable={false}
              />
            </FormField>
            <FormField label="Platform">
              <FormSearchSelect
                value={draft.platform}
                onChange={(v) => patch({ platform: v as CampaignPlatform })}
                options={PLATFORM_OPTIONS}
                searchable={false}
              />
            </FormField>
          </div>
          <FormField label="Budget (BDT)">
            <FormInput
              type="number"
              min={0}
              value={draft.budgetBdt}
              onChange={(e) => patch({ budgetBdt: e.target.value })}
              placeholder="50000"
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Start date">
              <input
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={draft.startDate}
                onChange={(e) => patch({ startDate: e.target.value })}
              />
            </FormField>
            <FormField label="End date">
              <input
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={draft.endDate}
                onChange={(e) => patch({ endDate: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Landing page name">
            <FormInput
              value={draft.landingPageName}
              onChange={(e) => patch({ landingPageName: e.target.value })}
              placeholder="Optional"
            />
          </FormField>
          <FormField label="Landing page URL">
            <FormInput
              value={draft.landingPageUrl}
              onChange={(e) => patch({ landingPageUrl: e.target.value })}
              placeholder="https://…"
            />
          </FormField>
          <FormField label="Notes">
            <FormTextarea
              rows={3}
              value={draft.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Audience, creative notes…"
            />
          </FormField>
          <p className="text-xs text-muted-foreground">
            Record ad spend in Reports → Marketing. Orders with matching UTM campaign
            name attribute revenue here.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
            {editing ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
