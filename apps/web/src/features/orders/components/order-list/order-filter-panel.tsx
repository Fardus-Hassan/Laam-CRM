'use client';

import * as React from 'react';

import { CollapsibleSection } from '@/components/form/collapsible-section';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormSelect } from '@/components/form/form-select';
import { Button } from '@/components/ui/button';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { MOCK_ORDER_STATUSES } from '@/features/orders/data/mock-status-config';
import {
  ORDER_SECTION_GRID_GAP,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const FILTER_REPORT_BUTTONS = [
  'Clear Filter',
  'Order Items',
  'Order Sources',
  'Duplicate Orders',
  'Orders Employee',
  'Order Previous Status',
  'Orders by Locations',
  'Courier Statuses',
] as const;

type OrderFilterPanelProps = {
  onClear?: () => void;
};

export function OrderFilterPanel({ onClear }: OrderFilterPanelProps) {
  const [createdRange, setCreatedRange] = React.useState('last_30');
  const [status, setStatus] = React.useState('');
  const [source, setSource] = React.useState('');
  const [district, setDistrict] = React.useState('');
  const [courier, setCourier] = React.useState('');
  const [paymentStatus, setPaymentStatus] = React.useState('');
  const [productSearch, setProductSearch] = React.useState('');

  const statusOptions = MOCK_ORDER_STATUSES.map((item) => ({
    value: item.slug,
    label: item.label,
  }));

  const sourceOptions = Object.entries(ORDER_SOURCE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <CollapsibleSection title="Filtering" defaultOpen={false}>
      <div className={cn('grid sm:grid-cols-2 lg:grid-cols-4', ORDER_SECTION_GRID_GAP)}>
        <FormField label="Order Created At">
          <FormSelect
            value={createdRange}
            onChange={setCreatedRange}
            options={[
              { value: 'last_30', label: 'Last 30 Days' },
              { value: 'this_month', label: 'This Month' },
              { value: 'custom', label: 'Custom Range' },
            ]}
            searchable={false}
          />
        </FormField>
        <FormField label="Courier Submitted At">
          <FormSelect
            value="all_time"
            onChange={() => undefined}
            options={[{ value: 'all_time', label: 'All Time' }]}
            searchable={false}
          />
        </FormField>
        <FormField label="Status Added At">
          <FormSelect
            value="all_time"
            onChange={() => undefined}
            options={[{ value: 'all_time', label: 'All Time' }]}
            searchable={false}
          />
        </FormField>
        <FormField label="Status">
          <FormSearchSelect
            value={status}
            onChange={setStatus}
            options={statusOptions}
            placeholder="All"
          />
        </FormField>
        <FormField label="Order Source">
          <FormSearchSelect
            value={source}
            onChange={setSource}
            options={sourceOptions}
            placeholder="All"
          />
        </FormField>
        <FormField label="District">
          <FormSearchSelect
            value={district}
            onChange={setDistrict}
            options={['Dhaka', 'Chittagong', 'Sylhet'].map((d) => ({ value: d, label: d }))}
            placeholder="Search District"
          />
        </FormField>
        <FormField label="Courier">
          <FormSelect
            value={courier}
            onChange={setCourier}
            options={[
              { value: '', label: 'All' },
              { value: 'pathao', label: 'Pathao' },
              { value: 'steadfast', label: 'Steadfast' },
            ]}
            placeholder="All"
          />
        </FormField>
        <FormField label="Payment Status">
          <FormSelect
            value={paymentStatus}
            onChange={setPaymentStatus}
            options={[
              { value: '', label: 'All' },
              { value: 'cod', label: 'COD' },
              { value: 'paid', label: 'Paid' },
            ]}
            placeholder="All"
          />
        </FormField>
        <FormField label="Select Product" className="sm:col-span-2">
          <FormInput
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            placeholder="Search Product"
          />
        </FormField>
        <FormField label="Product Amount Min">
          <FormInput type="number" min={0} placeholder="Min" />
        </FormField>
        <FormField label="Product Amount Max">
          <FormInput type="number" min={0} placeholder="Max" />
        </FormField>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {FILTER_REPORT_BUTTONS.map((label, index) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant={index === 0 ? 'outline' : 'secondary'}
            onClick={index === 0 ? onClear : undefined}
          >
            {label}
          </Button>
        ))}
      </div>
    </CollapsibleSection>
  );
}
