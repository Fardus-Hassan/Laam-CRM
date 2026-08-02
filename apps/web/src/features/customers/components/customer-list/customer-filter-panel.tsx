'use client';

import * as React from 'react';
import type { CustomerCompareOp, CustomerListQuery, TenantUser } from '@laam/types';

import { CollapsibleSection } from '@/components/form/collapsible-section';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { DateRangePicker } from '@/components/date-range/date-range-picker';
import { Button } from '@/components/ui/button';
import { ORDER_SECTION_GRID_GAP } from '@/features/orders/components/create-order/section-layout';
import { ordersApi } from '@/features/orders/api/orders-api';
import { rbacApi } from '@/features/rbac/api/rbac-api';
import {
  detectDateRangePreset,
  rangeFromISO,
  resolvePresetToRange,
  toISODateRange,
  type DateRangePresetId,
} from '@/lib/date-range';
import { cn } from '@/lib/utils';

export type CustomerFilterValues = {
  district?: string;
  employee?: string;
  product?: string;
  createdFrom?: string;
  createdTo?: string;
  lastOrderFrom?: string;
  lastOrderTo?: string;
  orderCount?: string;
  orderCountOp?: CustomerCompareOp;
  deliveredCount?: string;
  deliveredCountOp?: CustomerCompareOp;
  courierScoreMin?: string;
};

const OP_OPTIONS: { value: CustomerCompareOp; label: string }[] = [
  { value: 'gte', label: '≥ Greater or equal' },
  { value: 'lte', label: '≤ Lower or equal' },
  { value: 'eq', label: '= Equal' },
  { value: 'gt', label: '> Greater' },
  { value: 'lt', label: '< Lower' },
];

const OP_SHORT: Record<CustomerCompareOp, string> = {
  gte: '≥',
  lte: '≤',
  eq: '=',
  gt: '>',
  lt: '<',
};

export function emptyCustomerFilters(): CustomerFilterValues {
  return {
    orderCountOp: 'gte',
    deliveredCountOp: 'gte',
  };
}

export function filtersToQuery(
  filters: CustomerFilterValues,
): Partial<CustomerListQuery> {
  const orderCount = filters.orderCount?.trim()
    ? Number(filters.orderCount)
    : undefined;
  const deliveredCount = filters.deliveredCount?.trim()
    ? Number(filters.deliveredCount)
    : undefined;
  const courierScoreMin = filters.courierScoreMin?.trim()
    ? Number(filters.courierScoreMin)
    : undefined;
  return {
    district: filters.district?.trim() || undefined,
    employee: filters.employee?.trim() || undefined,
    product: filters.product?.trim() || undefined,
    createdFrom: filters.createdFrom || undefined,
    createdTo: filters.createdTo || undefined,
    lastOrderFrom: filters.lastOrderFrom || undefined,
    lastOrderTo: filters.lastOrderTo || undefined,
    orderCount: Number.isFinite(orderCount) ? orderCount : undefined,
    orderCountOp: orderCount !== undefined && Number.isFinite(orderCount)
      ? filters.orderCountOp
      : undefined,
    deliveredCount: Number.isFinite(deliveredCount) ? deliveredCount : undefined,
    deliveredCountOp:
      deliveredCount !== undefined && Number.isFinite(deliveredCount)
        ? filters.deliveredCountOp
        : undefined,
    courierScoreMin: Number.isFinite(courierScoreMin) ? courierScoreMin : undefined,
  };
}

export function countActiveFilters(filters: CustomerFilterValues): number {
  return buildActiveFilterChips(filters).length;
}

export function buildActiveFilterChips(
  filters: CustomerFilterValues,
): { key: keyof CustomerFilterValues; label: string }[] {
  const chips: { key: keyof CustomerFilterValues; label: string }[] = [];

  if (filters.createdFrom || filters.createdTo) {
    chips.push({
      key: 'createdFrom',
      label:
        filters.createdFrom && filters.createdTo
          ? `Created ${filters.createdFrom} → ${filters.createdTo}`
          : `Created ${filters.createdFrom ?? '…'} → ${filters.createdTo ?? '…'}`,
    });
  }
  if (filters.lastOrderFrom || filters.lastOrderTo) {
    chips.push({
      key: 'lastOrderFrom',
      label:
        filters.lastOrderFrom && filters.lastOrderTo
          ? `Last order ${filters.lastOrderFrom} → ${filters.lastOrderTo}`
          : `Last order ${filters.lastOrderFrom ?? '…'} → ${filters.lastOrderTo ?? '…'}`,
    });
  }
  if (filters.orderCount?.trim()) {
    chips.push({
      key: 'orderCount',
      label: `Orders ${OP_SHORT[filters.orderCountOp ?? 'gte']} ${filters.orderCount}`,
    });
  }
  if (filters.deliveredCount?.trim()) {
    chips.push({
      key: 'deliveredCount',
      label: `Delivered ${OP_SHORT[filters.deliveredCountOp ?? 'gte']} ${filters.deliveredCount}`,
    });
  }
  if (filters.product?.trim()) {
    chips.push({ key: 'product', label: `Product: ${filters.product}` });
  }
  if (filters.courierScoreMin?.trim()) {
    chips.push({
      key: 'courierScoreMin',
      label: `Courier ≥ ${filters.courierScoreMin}%`,
    });
  }
  if (filters.employee?.trim()) {
    chips.push({ key: 'employee', label: filters.employee });
  }
  if (filters.district?.trim()) {
    chips.push({ key: 'district', label: filters.district });
  }

  return chips;
}

export function removeCustomerFilter(
  filters: CustomerFilterValues,
  key: keyof CustomerFilterValues,
): CustomerFilterValues {
  const next = { ...filters };
  if (key === 'createdFrom') {
    next.createdFrom = undefined;
    next.createdTo = undefined;
  } else if (key === 'lastOrderFrom') {
    next.lastOrderFrom = undefined;
    next.lastOrderTo = undefined;
  } else if (key === 'orderCount') {
    next.orderCount = undefined;
    next.orderCountOp = 'gte';
  } else if (key === 'deliveredCount') {
    next.deliveredCount = undefined;
    next.deliveredCountOp = 'gte';
  } else {
    next[key] = undefined;
  }
  return next;
}

type CustomerFilterPanelProps = {
  values: CustomerFilterValues;
  onChange: (values: CustomerFilterValues) => void;
  onClear?: () => void;
};

export function CustomerFilterPanel({
  values,
  onChange,
  onClear,
}: CustomerFilterPanelProps) {
  const [teamUsers, setTeamUsers] = React.useState<TenantUser[]>([]);
  const [districtOptions, setDistrictOptions] = React.useState<
    Array<{ value: string; label: string }>
  >([]);
  const [productOptions, setProductOptions] = React.useState<
    Array<{ value: string; label: string }>
  >([]);

  React.useEffect(() => {
    let cancelled = false;
    void rbacApi
      .listUsers('')
      .then((list) => {
        if (!cancelled) setTeamUsers(list.filter((u) => u.status === 'active'));
      })
      .catch(() => {
        if (!cancelled) setTeamUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void ordersApi
      .getFormOptions()
      .then((opts) => {
        if (!cancelled) setDistrictOptions(opts.districts ?? []);
      })
      .catch(() => {
        if (!cancelled) setDistrictOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void import('@/features/inventory/api/inventory-api')
      .then((m) => m.inventoryApi.listProducts({ page: 1, pageSize: 200 }))
      .then((res) => {
        if (cancelled) return;
        setProductOptions(
          (res.items ?? []).map((product) => ({
            value: product.name,
            label: product.sku ? `${product.name} (${product.sku})` : product.name,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setProductOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function patch(next: Partial<CustomerFilterValues>) {
    onChange({ ...values, ...next });
  }

  const employeeOptions = teamUsers.map((u) => ({
    value: u.name,
    label: u.email ? `${u.name} · ${u.email}` : u.name,
  }));

  const createdRange = rangeFromISO(values.createdFrom, values.createdTo);
  const lastOrderRange = rangeFromISO(values.lastOrderFrom, values.lastOrderTo);
  const createdPreset = detectDateRangePreset(createdRange);
  const lastOrderPreset = detectDateRangePreset(lastOrderRange);

  return (
    <CollapsibleSection title="Filtering" defaultOpen>
      <div className={cn('grid sm:grid-cols-2 lg:grid-cols-4', ORDER_SECTION_GRID_GAP)}>
        <FormField label="Customer created">
          <DateRangePicker
            align="start"
            className="w-full"
            placeholder="All Time"
            value={
              createdRange ??
              (createdPreset !== 'all_time' && createdPreset !== 'custom'
                ? resolvePresetToRange(createdPreset)
                : undefined)
            }
            preset={(createdPreset as DateRangePresetId) ?? 'all_time'}
            onChange={(range) => {
              const preset = detectDateRangePreset(range);
              if (preset === 'all_time') {
                patch({ createdFrom: undefined, createdTo: undefined });
                return;
              }
              const iso = toISODateRange(range);
              patch({
                createdFrom: iso?.from,
                createdTo: iso?.to,
              });
            }}
          />
        </FormField>

        <FormField label="Last order">
          <DateRangePicker
            align="start"
            className="w-full"
            placeholder="All Time"
            value={
              lastOrderRange ??
              (lastOrderPreset !== 'all_time' && lastOrderPreset !== 'custom'
                ? resolvePresetToRange(lastOrderPreset)
                : undefined)
            }
            preset={(lastOrderPreset as DateRangePresetId) ?? 'all_time'}
            onChange={(range) => {
              const preset = detectDateRangePreset(range);
              if (preset === 'all_time') {
                patch({ lastOrderFrom: undefined, lastOrderTo: undefined });
                return;
              }
              const iso = toISODateRange(range);
              patch({
                lastOrderFrom: iso?.from,
                lastOrderTo: iso?.to,
              });
            }}
          />
        </FormField>

        <FormField label="Number of orders">
          <div className="flex gap-2">
            <FormInput
              type="number"
              min={0}
              className="w-24"
              value={values.orderCount ?? ''}
              onChange={(e) => patch({ orderCount: e.target.value || undefined })}
              placeholder="0"
            />
            <FormSearchSelect
              value={values.orderCountOp ?? 'gte'}
              onChange={(v) => patch({ orderCountOp: v as CustomerCompareOp })}
              options={OP_OPTIONS}
              searchable={false}
            />
          </div>
        </FormField>

        <FormField label="Delivered / completed">
          <div className="flex gap-2">
            <FormInput
              type="number"
              min={0}
              className="w-24"
              value={values.deliveredCount ?? ''}
              onChange={(e) => patch({ deliveredCount: e.target.value || undefined })}
              placeholder="0"
            />
            <FormSearchSelect
              value={values.deliveredCountOp ?? 'gte'}
              onChange={(v) => patch({ deliveredCountOp: v as CustomerCompareOp })}
              options={OP_OPTIONS}
              searchable={false}
            />
          </div>
        </FormField>

        <FormField label="Product">
          <FormSearchSelect
            value={values.product ?? ''}
            onChange={(product) => patch({ product: product || undefined })}
            options={productOptions}
            placeholder={productOptions.length ? 'All products' : 'No products yet'}
          />
        </FormField>

        <FormField label="Courier success min %">
          <FormInput
            type="number"
            min={0}
            max={100}
            value={values.courierScoreMin ?? ''}
            onChange={(e) => patch({ courierScoreMin: e.target.value || undefined })}
            placeholder="e.g. 80"
          />
        </FormField>

        <FormField label="Employee">
          <FormSearchSelect
            value={values.employee ?? ''}
            onChange={(employee) => patch({ employee: employee || undefined })}
            options={employeeOptions}
            placeholder={teamUsers.length ? 'All' : 'No team members'}
          />
        </FormField>

        <FormField label="District">
          <FormSearchSelect
            value={values.district ?? ''}
            onChange={(district) => patch({ district: district || undefined })}
            options={districtOptions}
            placeholder={districtOptions.length ? 'All' : 'No districts yet'}
          />
        </FormField>
      </div>

      <div className="mt-3">
        <Button type="button" size="sm" variant="outline" onClick={onClear}>
          Clear Filter
        </Button>
      </div>
    </CollapsibleSection>
  );
}
