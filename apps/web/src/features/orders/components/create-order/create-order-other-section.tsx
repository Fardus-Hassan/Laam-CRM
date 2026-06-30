'use client';

import { CollapsibleSection } from '@/components/form/collapsible-section';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { ORDER_SECTION_GRID_GAP } from '@/features/orders/components/create-order/section-layout';
import type { CreateOrderFormApi } from '@/features/orders/hooks/use-create-order-form';
import { cn } from '@/lib/utils';

type CreateOrderOtherSectionProps = {
  form: CreateOrderFormApi;
};

export function CreateOrderOtherSection({ form }: CreateOrderOtherSectionProps) {
  const { state, patch } = form;

  return (
    <CollapsibleSection title="Other Information" defaultOpen>
      <p className="mb-3 text-sm text-muted-foreground">
        Manually track ad information for this order (optional). Stored as URL parameters,
        just like website orders.
      </p>
      <div className={cn('grid sm:grid-cols-2 lg:grid-cols-4', ORDER_SECTION_GRID_GAP)}>
        <FormField label="UTM Source" htmlFor="utmSource">
          <FormInput
            id="utmSource"
            value={state.utmSource}
            onChange={(event) => patch({ utmSource: event.target.value })}
            placeholder="e.g. fb"
          />
        </FormField>
        <FormField label="UTM ID" htmlFor="utmId">
          <FormInput
            id="utmId"
            value={state.utmId}
            onChange={(event) => patch({ utmId: event.target.value })}
          />
        </FormField>
        <FormField label="UTM Content" htmlFor="utmContent">
          <FormInput
            id="utmContent"
            value={state.utmContent}
            onChange={(event) => patch({ utmContent: event.target.value })}
          />
        </FormField>
        <FormField label="UTM Campaign" htmlFor="utmCampaign">
          <FormInput
            id="utmCampaign"
            value={state.utmCampaign}
            onChange={(event) => patch({ utmCampaign: event.target.value })}
          />
        </FormField>
      </div>
    </CollapsibleSection>
  );
}
