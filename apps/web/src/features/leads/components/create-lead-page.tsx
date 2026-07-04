'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { OrderSource } from '@laam/types';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormPhoneInput } from '@/components/form/form-phone-input';
import { FormSelect } from '@/components/form/form-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CreateLeadProductsSection,
  type DraftLineItem,
} from '@/features/leads/components/create-lead-products-section';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { LEAD_SOURCE_LABELS } from '@/features/leads/config/lead-filters';
import { LEAD_AGENTS } from '@/features/leads/data/mock-leads';
import { useLeadMutations } from '@/features/leads/hooks/use-lead-mutations';
import { createLeadsListBreadcrumbs } from '@/features/leads/lib/lead-breadcrumbs';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export function CreateLeadPage() {
  const router = useRouter();
  const { createLead, isLoading } = useLeadMutations();
  const [lineItems, setLineItems] = React.useState<DraftLineItem[]>([]);
  const [draft, setDraft] = React.useState({
    name: '',
    phone: '',
    email: '',
    area: '',
    address: '',
    source: 'call' as OrderSource,
    campaignName: '',
    estimatedValue: '',
    assignedAgentName: '',
    notes: '',
  });

  function patch(values: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...values }));
  }

  const lineSubtotal = lineItems.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const estimatedValue = draft.estimatedValue ? Number(draft.estimatedValue) : lineSubtotal || undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    const lead = await createLead({
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim() || undefined,
      area: draft.area.trim() || undefined,
      address: draft.address.trim() || undefined,
      source: draft.source,
      campaignName: draft.campaignName.trim() || undefined,
      estimatedValue,
      assignedAgentName: draft.assignedAgentName || undefined,
      notes: draft.notes.trim() || undefined,
      lineItems: lineItems.map(({ productName, sku, quantity, unitPrice }) => ({
        productName,
        sku,
        quantity,
        unitPrice,
      })),
    });

    router.push(`/dashboard/leads/${lead.leadNumber}`);
  }

  const sourceOptions = (Object.keys(LEAD_SOURCE_LABELS) as OrderSource[]).map((source) => ({
    value: source,
    label: LEAD_SOURCE_LABELS[source],
  }));

  return (
    <PageShell
      title="New lead"
      description="Capture a buyer inquiry — modhu, khejur, or gift items before confirming the order."
      breadcrumbs={[
        ...createLeadsListBreadcrumbs(),
        { label: 'New lead' },
      ]}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className={cn(ORDER_PAGE_GAP)}>
        <Card className={cn(ORDER_CARD_CLASS)}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Lead details</CardTitle>
          </CardHeader>
          <CardContent className={cn('grid sm:grid-cols-2', ORDER_SECTION_BODY_CLASS, ORDER_SECTION_GRID_GAP)}>
            <FormField label="Name" required>
              <FormInput value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
            </FormField>
            <FormField label="Mobile" required>
              <FormPhoneInput value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} />
            </FormField>
            <FormField label="Email">
              <FormInput
                type="email"
                value={draft.email}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </FormField>
            <FormField label="Area">
              <FormInput value={draft.area} onChange={(e) => patch({ area: e.target.value })} />
            </FormField>
            <FormField label="Address" className="sm:col-span-2">
              <FormInput value={draft.address} onChange={(e) => patch({ address: e.target.value })} />
            </FormField>
            <FormField label="Source">
              <FormSelect
                value={draft.source}
                onChange={(source) => patch({ source: source as OrderSource })}
                options={sourceOptions}
                searchable={false}
              />
            </FormField>
            <FormField label="Campaign">
              <FormInput
                value={draft.campaignName}
                onChange={(e) => patch({ campaignName: e.target.value })}
              />
            </FormField>
            <FormField label="Est. value (৳)">
              <FormInput
                inputMode="decimal"
                value={draft.estimatedValue}
                onChange={(e) => patch({ estimatedValue: e.target.value })}
                placeholder={lineSubtotal ? formatCurrency(lineSubtotal) : undefined}
              />
            </FormField>
            <FormField label="Assign to">
              <FormSelect
                value={draft.assignedAgentName}
                onChange={(assignedAgentName) => patch({ assignedAgentName })}
                options={LEAD_AGENTS.map((name) => ({ value: name, label: name }))}
                placeholder="Optional"
              />
            </FormField>
            <FormField label="Notes" className="sm:col-span-2">
              <FormTextarea
                rows={3}
                value={draft.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </FormField>
          </CardContent>
        </Card>

        <CreateLeadProductsSection lineItems={lineItems} onChange={setLineItems} />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isLoading}>
            Create lead
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard/leads')}>
            Cancel
          </Button>
          {lineSubtotal > 0 ? (
            <p className="text-sm text-muted-foreground">
              Pipeline value: <span className="font-semibold tabular-nums">{formatCurrency(lineSubtotal)}</span>
            </p>
          ) : null}
        </div>
      </form>
    </PageShell>
  );
}
