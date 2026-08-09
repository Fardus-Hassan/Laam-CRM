'use client';

import * as React from 'react';
import type { OrderDetail, OrderFormOption, OrderSource } from '@laam/types';
import { MessageCircle, Phone, UserRound } from 'lucide-react';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormPhoneInput } from '@/components/form/form-phone-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormSelect } from '@/components/form/form-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { Button } from '@/components/ui/button';
import { CreateOrderCustomerSection } from '@/features/orders/components/create-order/create-order-customer-section';
import {
  ORDER_SECTION_GRID_GAP,
} from '@/features/orders/components/create-order/section-layout';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { searchDistricts } from '@/features/orders/data/mock-create-order';
import type { CreateOrderFormApi } from '@/features/orders/hooks/use-create-order-form';
import { cn } from '@/lib/utils';

import { EditableSectionCard } from './editable-section-card';

export type CustomerBlockValue = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  district?: string;
  area?: string;
  source?: OrderSource;
};

type CustomerBlockProps =
  | { mode: 'create'; form: CreateOrderFormApi }
  | {
      mode: 'readonly' | 'edit';
      value: CustomerBlockValue;
      onChange?: (value: CustomerBlockValue) => void;
      onSave?: () => void | Promise<void>;
      districts?: OrderFormOption[];
      sources?: OrderFormOption[];
    };

export function CustomerBlock(props: CustomerBlockProps) {
  if (props.mode === 'create') {
    return <CreateOrderCustomerSection form={props.form} />;
  }

  const { value, onChange, onSave, districts, sources } = props;
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  const districtOptions = React.useMemo(() => {
    if (districts?.length) {
      return districts.map((d) => ({ value: d.value, label: d.label }));
    }
    return searchDistricts(draft.district ?? '').map((d) => ({
      value: d,
      label: d,
    }));
  }, [districts, draft.district]);

  const sourceOptions = React.useMemo(() => {
    if (sources?.length) {
      return sources.map((s) => ({ value: s.value, label: s.label }));
    }
    return (Object.keys(ORDER_SOURCE_LABELS) as OrderSource[]).map((source) => ({
      value: source,
      label: ORDER_SOURCE_LABELS[source],
    }));
  }, [sources]);

  function patch(patch: Partial<CustomerBlockValue>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange?.(next);
  }

  const readContent = (
    <div className="space-y-3.5 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold leading-tight">{value.name}</p>
          <p className="mt-1 font-medium tabular-nums text-foreground">{value.phone}</p>
          {value.email ? <p className="mt-0.5 text-muted-foreground">{value.email}</p> : null}
        </div>
        {value.source ? (
          <span className="shrink-0 rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
            {ORDER_SOURCE_LABELS[value.source]}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="h-8" asChild>
          <a href={`tel:${value.phone.replace(/\D/g, '')}`}>
            <Phone className="size-4" />
            Call
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => {
            window.open(
              `https://wa.me/${value.phone.replace(/\D/g, '')}`,
              '_blank',
              'noopener,noreferrer',
            );
          }}
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </Button>
      </div>
      <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/15 p-2.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Address
          </p>
          <p className="mt-0.5 leading-relaxed">{value.address}</p>
        </div>
        {value.district ? (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              District
            </p>
            <p className="mt-0.5 font-medium">{value.district}</p>
          </div>
        ) : null}
        {value.area ? (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Area
            </p>
            <p className="mt-0.5 font-medium">{value.area}</p>
          </div>
        ) : null}
      </div>
    </div>
  );

  const editContent = (
    <div className={cn('grid sm:grid-cols-2', ORDER_SECTION_GRID_GAP)}>
      <FormField label="Name" required>
        <FormInput value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
      </FormField>
      <FormField label="Mobile" required>
        <FormPhoneInput value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} />
      </FormField>
      <FormField label="Email" className="sm:col-span-2">
        <FormInput
          type="email"
          value={draft.email ?? ''}
          onChange={(e) => patch({ email: e.target.value })}
        />
      </FormField>
      <FormField label="Address" className="sm:col-span-2" required>
        <FormTextarea
          rows={3}
          value={draft.address}
          onChange={(e) => patch({ address: e.target.value })}
        />
      </FormField>
      <FormField label="District">
        <FormSearchSelect
          value={draft.district ?? ''}
          onChange={(district) => patch({ district })}
          options={districtOptions}
          placeholder="Search District"
        />
      </FormField>
      <FormField label="Source">
        <FormSelect
          value={draft.source ?? ''}
          onChange={(source) => patch({ source: source as OrderSource })}
          options={sourceOptions}
          placeholder="Select source"
        />
      </FormField>
    </div>
  );

  if (props.mode === 'readonly') {
    return (
      <EditableSectionCard
        title="Customer Information"
        icon={<UserRound className="size-4 text-primary" />}
        canEdit={false}
      >
        {readContent}
      </EditableSectionCard>
    );
  }

  return (
    <EditableSectionCard
      title="Customer Information"
      icon={<UserRound className="size-4 text-primary" />}
      editContent={editContent}
      onSave={onSave}
      onCancel={() => setDraft(value)}
    >
      {readContent}
    </EditableSectionCard>
  );
}

export function orderToCustomerValue(order: OrderDetail): CustomerBlockValue {
  return {
    name: order.customerName,
    phone: order.customerPhone,
    email: order.customerEmail,
    address: order.shippingAddress,
    district: order.district,
    area: order.shippingArea,
    source: order.source,
  };
}
