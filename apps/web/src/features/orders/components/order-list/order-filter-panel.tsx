'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { CollapsibleSection } from '@/components/form/collapsible-section';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormSelect } from '@/components/form/form-select';
import { Button } from '@/components/ui/button';
import type { OrderListQuery, OrderSource, PaymentStatus, OrderStatusType } from '@laam/types';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { MOCK_ORDER_STATUSES } from '@/features/orders/data/mock-status-config';
import {
  ORDER_SECTION_GRID_GAP,
} from '@/features/orders/components/create-order/section-layout';
import {
  loadOrderFilterPresets,
  saveOrderFilterPreset,
} from '@/features/orders/lib/order-filter-presets';
import {
  buildCourierStatusFilterOptions,
  parseCourierStatusFilterValue,
} from '@/features/orders/lib/courier-status-filter-options';
import { cn } from '@/lib/utils';

export type OrderFilterValues = Pick<
  OrderListQuery,
  | 'source'
  | 'employee'
  | 'district'
  | 'paymentStatus'
  | 'courier'
  | 'courierStatusSlug'
  | 'product'
  | 'dateRange'
> & { status?: OrderStatusType };

const EMPLOYEES = ['Sakib Ahmed', 'Mitu Rahman', 'Imran Hossain', 'Tania Sultana', 'Arif Mahmud'];

const EMPTY_FILTERS: OrderFilterValues = {
  source: undefined,
  employee: undefined,
  district: undefined,
  paymentStatus: undefined,
  courier: undefined,
  courierStatusSlug: undefined,
  product: undefined,
  dateRange: 'last_30',
  status: undefined,
};

type OrderFilterPanelProps = {
  values: OrderFilterValues;
  onChange: (values: OrderFilterValues) => void;
  onClear?: () => void;
  hideStatus?: boolean;
  search?: string;
};

export function OrderFilterPanel({
  values,
  onChange,
  onClear,
  hideStatus,
  search,
}: OrderFilterPanelProps) {
  const [presets, setPresets] = React.useState(loadOrderFilterPresets);
  const [presetName, setPresetName] = React.useState('');
  const [courierStatusOptions, setCourierStatusOptions] = React.useState<
    Array<{ value: string; label: string }>
  >(() =>
    buildCourierStatusFilterOptions([], []).map((o) => ({ value: o.value, label: o.label })),
  );

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([
      import('@/features/settings/api/pathao-settings-api').then((m) =>
        m.pathaoSettingsApi.listStatusMaps().catch(() => []),
      ),
      import('@/features/settings/api/carrybee-settings-api').then((m) =>
        m.carrybeeSettingsApi.listStatusMaps().catch(() => []),
      ),
    ])
      .then(([pathaoMaps, carrybeeMaps]) => {
        if (cancelled) return;
        const options = buildCourierStatusFilterOptions(pathaoMaps, carrybeeMaps);
        setCourierStatusOptions(options.map((o) => ({ value: o.value, label: o.label })));
      })
      .catch(() => {
        if (cancelled) return;
        const options = buildCourierStatusFilterOptions([], []);
        setCourierStatusOptions(options.map((o) => ({ value: o.value, label: o.label })));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function patch(patch: Partial<OrderFilterValues>) {
    onChange({ ...values, ...patch });
  }

  function handleSavePreset() {
    if (!presetName.trim()) {
      toast.error('Enter a preset name');
      return;
    }
    const id = `preset-${Date.now()}`;
    const filters: Record<string, string> = {};
    for (const [key, val] of Object.entries(values)) {
      if (val) filters[key] = String(val);
    }
    if (search?.trim()) {
      filters.search = search.trim();
    }
    const next = saveOrderFilterPreset({
      id,
      name: presetName.trim(),
      filters,
      createdAt: new Date().toISOString(),
    });
    setPresets(next);
    setPresetName('');
    toast.success('Filter preset saved');
  }

  function handleLoadPreset(presetId: string) {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    onChange({ ...EMPTY_FILTERS, ...(preset.filters as OrderFilterValues) });
    toast.success(`Loaded preset: ${preset.name}`);
  }

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
            value={values.dateRange ?? 'last_30'}
            onChange={(dateRange) =>
              patch({ dateRange: dateRange as OrderFilterValues['dateRange'] })
            }
            options={[
              { value: 'last_30', label: 'Last 30 Days' },
              { value: 'this_month', label: 'This Month' },
              { value: 'all_time', label: 'All Time' },
              { value: 'custom', label: 'Custom Range' },
            ]}
            searchable={false}
          />
        </FormField>
        {!hideStatus ? (
          <FormField label="Status">
            <FormSearchSelect
              value={values.status ?? ''}
              onChange={(status) => patch({ status: (status || undefined) as OrderStatusType | undefined })}
              options={statusOptions}
              placeholder="All"
            />
          </FormField>
        ) : null}
        <FormField label="Order Source">
          <FormSearchSelect
            value={values.source ?? ''}
            onChange={(source) => patch({ source: (source || undefined) as OrderSource | undefined })}
            options={sourceOptions}
            placeholder="All"
          />
        </FormField>
        <FormField label="Employee">
          <FormSearchSelect
            value={values.employee ?? ''}
            onChange={(employee) => patch({ employee: employee || undefined })}
            options={EMPLOYEES.map((name) => ({ value: name, label: name }))}
            placeholder="All"
          />
        </FormField>
        <FormField label="District">
          <FormSearchSelect
            value={values.district ?? ''}
            onChange={(district) => patch({ district: district || undefined })}
            options={['Dhaka', 'Chittagong', 'Sylhet', 'Gulshan', 'Mirpur'].map((d) => ({
              value: d,
              label: d,
            }))}
            placeholder="All"
          />
        </FormField>
        <FormField label="Courier">
          <FormSelect
            value={values.courier ?? ''}
            onChange={(courier) => patch({ courier: courier || undefined })}
            options={[
              { value: '', label: 'All' },
              { value: 'pathao', label: 'Pathao' },
              { value: 'steadfast', label: 'Steadfast' },
              { value: 'carrybee', label: 'Carrybee' },
            ]}
            placeholder="All"
          />
        </FormField>
        <FormField label="Courier status">
          <FormSearchSelect
            value={
              values.courierStatusSlug
                ? values.courier === 'pathao' || values.courier === 'carrybee'
                  ? `${values.courier}:${values.courierStatusSlug}`
                  : values.courierStatusSlug
                : ''
            }
            onChange={(raw) => {
              if (!raw) {
                patch({ courierStatusSlug: undefined });
                return;
              }
              const parsed = parseCourierStatusFilterValue(raw);
              patch({
                courierStatusSlug: parsed.slug,
                ...(parsed.provider ? { courier: parsed.provider } : {}),
              });
            }}
            options={[
              { value: '', label: 'All' },
              ...courierStatusOptions,
            ]}
            placeholder="All"
            searchPlaceholder="Search Pathao or Carrybee…"
          />
        </FormField>
        <FormField label="Payment Status">
          <FormSelect
            value={values.paymentStatus ?? ''}
            onChange={(paymentStatus) =>
              patch({
                paymentStatus: (paymentStatus || undefined) as PaymentStatus | undefined,
              })
            }
            options={[
              { value: '', label: 'All' },
              { value: 'cod', label: 'COD' },
              { value: 'paid', label: 'Paid' },
              { value: 'partial', label: 'Partial' },
            ]}
            placeholder="All"
          />
        </FormField>
        <FormField label="Product search" className="sm:col-span-2">
          <FormInput
            value={values.product ?? ''}
            onChange={(event) => patch({ product: event.target.value || undefined })}
            placeholder="Search product name"
          />
        </FormField>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onClear}>
          Clear Filter
        </Button>
        <div className="flex flex-1 flex-wrap items-end gap-2 sm:min-w-[280px]">
          <FormField label="Save preset" className="min-w-[140px] flex-1">
            <FormInput
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
            />
          </FormField>
          <Button type="button" size="sm" variant="secondary" onClick={handleSavePreset}>
            Save
          </Button>
        </div>
        {presets.length > 0 ? (
          <FormField label="Load preset">
            <FormSelect
              value=""
              onChange={(id) => {
                if (id) handleLoadPreset(id);
              }}
              options={[
                { value: '', label: 'Choose preset…' },
                ...presets.map((p) => ({ value: p.id, label: p.name })),
              ]}
              searchable={false}
            />
          </FormField>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}

export { EMPTY_FILTERS };
