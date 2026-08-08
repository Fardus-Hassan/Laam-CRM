'use client';

import * as React from 'react';
import type { Warehouse } from '@laam/types';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { inventoryApi } from '@/features/inventory/api/inventory-api';

type FulfillmentWarehouseSelectProps = {
  value?: string;
  onChange: (warehouseId: string) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  hint?: string;
  className?: string;
};

export function FulfillmentWarehouseSelect({
  value = '',
  onChange,
  disabled,
  required = true,
  label = 'Fulfillment warehouse',
  hint = 'Stock will be cut from this warehouse on confirm / courier book.',
  className,
}: FulfillmentWarehouseSelectProps) {
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void inventoryApi
      .listWarehouses()
      .then((res) => {
        if (cancelled) return;
        const items = (res.items ?? []).filter((w) => w.isActive !== false);
        setWarehouses(items);
        if (!value && items.length === 1 && items[0]) {
          onChange(items[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setWarehouses([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  return (
    <FormField label={label} required={required} className={className} hint={hint}>
      <FormSearchSelect
        value={value}
        onChange={onChange}
        options={warehouses.map((w) => ({
          value: w.id,
          label: w.isDefault ? `${w.name} (default)` : w.name,
        }))}
        placeholder={loading ? 'Loading warehouses…' : 'Select warehouse'}
        disabled={disabled || loading}
        searchable={warehouses.length > 6}
      />
    </FormField>
  );
}

export const STOCK_CUT_STATUS_SET = new Set([
  'confirmed',
  'processing',
  'processing_2',
  'in_courier',
]);
