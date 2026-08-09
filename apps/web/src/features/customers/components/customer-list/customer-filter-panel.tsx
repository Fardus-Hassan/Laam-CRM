'use client';

import * as React from 'react';
import type { CustomerCompareOp, CustomerListQuery, TenantUser } from '@laam/types';
import { X } from 'lucide-react';

import { CollapsibleSection } from '@/components/form/collapsible-section';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { DateRangePicker } from '@/components/date-range/date-range-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
  productExclude?: boolean;
  createdFrom?: string;
  createdTo?: string;
  lastOrderFrom?: string;
  lastOrderTo?: string;
  noOrderFrom?: string;
  noOrderTo?: string;
  followupFrom?: string;
  followupTo?: string;
  followupStatus?: 'pending' | 'none' | 'overdue' | '';
  deliveredFrom?: string;
  deliveredTo?: string;
  orderCount?: string;
  orderCountOp?: CustomerCompareOp;
  deliveredCount?: string;
  deliveredCountOp?: CustomerCompareOp;
  orderStatuses?: string;
  orderStatusesExclude?: boolean;
  orderSources?: string;
  orderSourcesExclude?: boolean;
  customerTag?: string;
  amountMin?: string;
  amountMax?: string;
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

const FOLLOWUP_STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending follow-up' },
  { value: 'none', label: 'No follow-up' },
  { value: 'overdue', label: 'Overdue' },
];

/** Quick purchase-count pills (Bizmation-style). */
export const PURCHASE_COUNT_PILLS = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function emptyCustomerFilters(): CustomerFilterValues {
  return {
    orderCountOp: 'gte',
    deliveredCountOp: 'gte',
  };
}

function rangeChip(
  label: string,
  from?: string,
  to?: string,
): string {
  if (from && to) return `${label} ${from} → ${to}`;
  return `${label} ${from ?? '…'} → ${to ?? '…'}`;
}

export function filtersToQuery(
  filters: CustomerFilterValues,
): Partial<CustomerListQuery> {
  const orderCount = filters.orderCount?.trim() ? Number(filters.orderCount) : undefined;
  const deliveredCount = filters.deliveredCount?.trim()
    ? Number(filters.deliveredCount)
    : undefined;
  const courierScoreMin = filters.courierScoreMin?.trim()
    ? Number(filters.courierScoreMin)
    : undefined;
  const amountMin = filters.amountMin?.trim() ? Number(filters.amountMin) : undefined;
  const amountMax = filters.amountMax?.trim() ? Number(filters.amountMax) : undefined;

  return {
    district: filters.district?.trim() || undefined,
    employee: filters.employee?.trim() || undefined,
    product: filters.product?.trim() || undefined,
    productExclude: filters.product?.trim() ? Boolean(filters.productExclude) : undefined,
    createdFrom: filters.createdFrom || undefined,
    createdTo: filters.createdTo || undefined,
    lastOrderFrom: filters.lastOrderFrom || undefined,
    lastOrderTo: filters.lastOrderTo || undefined,
    noOrderFrom: filters.noOrderFrom || undefined,
    noOrderTo: filters.noOrderTo || undefined,
    followupFrom: filters.followupFrom || undefined,
    followupTo: filters.followupTo || undefined,
    followupStatus: filters.followupStatus || undefined,
    deliveredFrom: filters.deliveredFrom || undefined,
    deliveredTo: filters.deliveredTo || undefined,
    orderCount: Number.isFinite(orderCount) ? orderCount : undefined,
    orderCountOp:
      orderCount !== undefined && Number.isFinite(orderCount)
        ? filters.orderCountOp
        : undefined,
    deliveredCount: Number.isFinite(deliveredCount) ? deliveredCount : undefined,
    deliveredCountOp:
      deliveredCount !== undefined && Number.isFinite(deliveredCount)
        ? filters.deliveredCountOp
        : undefined,
    orderStatuses: filters.orderStatuses?.trim() || undefined,
    orderStatusesExclude: filters.orderStatuses?.trim()
      ? Boolean(filters.orderStatusesExclude)
      : undefined,
    orderSources: filters.orderSources?.trim() || undefined,
    orderSourcesExclude: filters.orderSources?.trim()
      ? Boolean(filters.orderSourcesExclude)
      : undefined,
    customerTag: filters.customerTag?.trim() || undefined,
    amountMin: Number.isFinite(amountMin) ? amountMin : undefined,
    amountMax: Number.isFinite(amountMax) ? amountMax : undefined,
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
      label: rangeChip('Created', filters.createdFrom, filters.createdTo),
    });
  }
  if (filters.lastOrderFrom || filters.lastOrderTo) {
    chips.push({
      key: 'lastOrderFrom',
      label: rangeChip('Last order', filters.lastOrderFrom, filters.lastOrderTo),
    });
  }
  if (filters.noOrderFrom || filters.noOrderTo) {
    chips.push({
      key: 'noOrderFrom',
      label: rangeChip('No order', filters.noOrderFrom, filters.noOrderTo),
    });
  }
  if (filters.followupFrom || filters.followupTo) {
    chips.push({
      key: 'followupFrom',
      label: rangeChip('Follow-up', filters.followupFrom, filters.followupTo),
    });
  }
  if (filters.followupStatus) {
    chips.push({
      key: 'followupStatus',
      label: `Follow-up: ${filters.followupStatus}`,
    });
  }
  if (filters.deliveredFrom || filters.deliveredTo) {
    chips.push({
      key: 'deliveredFrom',
      label: rangeChip('Delivered', filters.deliveredFrom, filters.deliveredTo),
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
  if (filters.orderStatuses?.trim()) {
    chips.push({
      key: 'orderStatuses',
      label: `${filters.orderStatusesExclude ? 'Not status' : 'Status'}: ${filters.orderStatuses}`,
    });
  }
  if (filters.orderSources?.trim()) {
    chips.push({
      key: 'orderSources',
      label: `${filters.orderSourcesExclude ? 'Not source' : 'Source'}: ${filters.orderSources}`,
    });
  }
  if (filters.product?.trim()) {
    chips.push({
      key: 'product',
      label: `${filters.productExclude ? 'Not product' : 'Product'}: ${filters.product}`,
    });
  }
  if (filters.customerTag?.trim()) {
    chips.push({ key: 'customerTag', label: `Tag: ${filters.customerTag}` });
  }
  if (filters.courierScoreMin?.trim()) {
    chips.push({
      key: 'courierScoreMin',
      label: `Courier ≥ ${filters.courierScoreMin}%`,
    });
  }
  if (filters.amountMin?.trim() || filters.amountMax?.trim()) {
    chips.push({
      key: 'amountMin',
      label: `Spent ${filters.amountMin ?? '0'}–${filters.amountMax ?? '∞'}`,
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
  } else if (key === 'noOrderFrom') {
    next.noOrderFrom = undefined;
    next.noOrderTo = undefined;
  } else if (key === 'followupFrom') {
    next.followupFrom = undefined;
    next.followupTo = undefined;
  } else if (key === 'deliveredFrom') {
    next.deliveredFrom = undefined;
    next.deliveredTo = undefined;
  } else if (key === 'orderCount') {
    next.orderCount = undefined;
    next.orderCountOp = 'gte';
  } else if (key === 'deliveredCount') {
    next.deliveredCount = undefined;
    next.deliveredCountOp = 'gte';
  } else if (key === 'orderStatuses') {
    next.orderStatuses = undefined;
    next.orderStatusesExclude = undefined;
  } else if (key === 'orderSources') {
    next.orderSources = undefined;
    next.orderSourcesExclude = undefined;
  } else if (key === 'product') {
    next.product = undefined;
    next.productExclude = undefined;
  } else if (key === 'amountMin') {
    next.amountMin = undefined;
    next.amountMax = undefined;
  } else {
    next[key] = undefined as never;
  }
  return next;
}

function DateRangeField({
  label,
  from,
  to,
  onChange,
}: {
  label: string;
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
}) {
  const range = rangeFromISO(from, to);
  const preset = detectDateRangePreset(range);
  return (
    <FormField label={label}>
      <DateRangePicker
        align="start"
        className="w-full"
        placeholder="All Time"
        value={
          range ??
          (preset !== 'all_time' && preset !== 'custom'
            ? resolvePresetToRange(preset)
            : undefined)
        }
        preset={(preset as DateRangePresetId) ?? 'all_time'}
        onChange={(nextRange) => {
          const nextPreset = detectDateRangePreset(nextRange);
          if (nextPreset === 'all_time') {
            onChange(undefined, undefined);
            return;
          }
          const iso = toISODateRange(nextRange);
          onChange(iso?.from, iso?.to);
        }}
      />
    </FormField>
  );
}

type CustomerFilterPanelProps = {
  values: CustomerFilterValues;
  onChange: (values: CustomerFilterValues) => void;
  onClear?: () => void;
  variant?: 'inline' | 'popover';
  onClose?: () => void;
  pinned?: boolean;
};

export function CustomerFilterPanel({
  values,
  onChange,
  onClear,
  variant = 'inline',
  onClose,
  pinned = false,
}: CustomerFilterPanelProps) {
  const [teamUsers, setTeamUsers] = React.useState<TenantUser[]>([]);
  const [districtOptions, setDistrictOptions] = React.useState<
    Array<{ value: string; label: string }>
  >([]);
  const [productOptions, setProductOptions] = React.useState<
    Array<{ value: string; label: string }>
  >([]);
  const [statusOptions, setStatusOptions] = React.useState<
    Array<{ value: string; label: string }>
  >([]);
  const [sourceOptions, setSourceOptions] = React.useState<
    Array<{ value: string; label: string }>
  >([]);
  const [tagOptions, setTagOptions] = React.useState<
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
        if (cancelled) return;
        setDistrictOptions(opts.districts ?? []);
        setStatusOptions(opts.statuses ?? []);
        setSourceOptions(opts.sources ?? []);
        setTagOptions(opts.customerTags ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setDistrictOptions([]);
          setStatusOptions([]);
          setSourceOptions([]);
          setTagOptions([]);
        }
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

  const fields = (
      <div className={cn('grid sm:grid-cols-2 lg:grid-cols-4', ORDER_SECTION_GRID_GAP)}>
        <DateRangeField
          label="Create Date"
          from={values.createdFrom}
          to={values.createdTo}
          onChange={(createdFrom, createdTo) => patch({ createdFrom, createdTo })}
        />
        <DateRangeField
          label="Last Order Range"
          from={values.lastOrderFrom}
          to={values.lastOrderTo}
          onChange={(lastOrderFrom, lastOrderTo) => patch({ lastOrderFrom, lastOrderTo })}
        />
        <DateRangeField
          label="No Order Range"
          from={values.noOrderFrom}
          to={values.noOrderTo}
          onChange={(noOrderFrom, noOrderTo) => patch({ noOrderFrom, noOrderTo })}
        />
        <DateRangeField
          label="Followup Range"
          from={values.followupFrom}
          to={values.followupTo}
          onChange={(followupFrom, followupTo) => patch({ followupFrom, followupTo })}
        />
        <DateRangeField
          label="Delivered At"
          from={values.deliveredFrom}
          to={values.deliveredTo}
          onChange={(deliveredFrom, deliveredTo) => patch({ deliveredFrom, deliveredTo })}
        />

        <FormField label="Followup Status">
          <FormSearchSelect
            value={values.followupStatus ?? ''}
            onChange={(followupStatus) =>
              patch({
                followupStatus: (followupStatus || '') as CustomerFilterValues['followupStatus'],
              })
            }
            options={FOLLOWUP_STATUS_OPTIONS}
            searchable={false}
          />
        </FormField>

        <FormField label="Number of Orders">
          <div className="flex gap-2">
            <FormSearchSelect
              value={values.orderCountOp ?? 'gte'}
              onChange={(v) => patch({ orderCountOp: v as CustomerCompareOp })}
              options={OP_OPTIONS}
              searchable={false}
              className="min-w-0 flex-1"
            />
            <FormInput
              type="number"
              min={0}
              className="w-20"
              value={values.orderCount ?? ''}
              onChange={(e) => patch({ orderCount: e.target.value || undefined })}
              placeholder="0"
            />
          </div>
        </FormField>

        <FormField label="Number of Delivered">
          <div className="flex gap-2">
            <FormSearchSelect
              value={values.deliveredCountOp ?? 'gte'}
              onChange={(v) => patch({ deliveredCountOp: v as CustomerCompareOp })}
              options={OP_OPTIONS}
              searchable={false}
              className="min-w-0 flex-1"
            />
            <FormInput
              type="number"
              min={0}
              className="w-20"
              value={values.deliveredCount ?? ''}
              onChange={(e) => patch({ deliveredCount: e.target.value || undefined })}
              placeholder="0"
            />
          </div>
        </FormField>

        <FormField label="Order Statuses">
          <div className="space-y-2">
            <FormSearchSelect
              value={values.orderStatuses ?? ''}
              onChange={(orderStatuses) => patch({ orderStatuses: orderStatuses || undefined })}
              options={statusOptions}
              placeholder={statusOptions.length ? 'All statuses' : 'No statuses'}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={Boolean(values.orderStatusesExclude)}
                onCheckedChange={(checked) =>
                  patch({ orderStatusesExclude: checked === true })
                }
              />
              Exclude
            </label>
          </div>
        </FormField>

        <FormField label="Order Source">
          <div className="space-y-2">
            <FormSearchSelect
              value={values.orderSources ?? ''}
              onChange={(orderSources) => patch({ orderSources: orderSources || undefined })}
              options={sourceOptions}
              placeholder={sourceOptions.length ? 'All sources' : 'No sources'}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={Boolean(values.orderSourcesExclude)}
                onCheckedChange={(checked) =>
                  patch({ orderSourcesExclude: checked === true })
                }
              />
              Exclude
            </label>
          </div>
        </FormField>

        <FormField label="Product">
          <div className="space-y-2">
            <FormSearchSelect
              value={values.product ?? ''}
              onChange={(product) => patch({ product: product || undefined })}
              options={productOptions}
              placeholder={productOptions.length ? 'All products' : 'No products yet'}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={Boolean(values.productExclude)}
                onCheckedChange={(checked) => patch({ productExclude: checked === true })}
              />
              Exclude
            </label>
          </div>
        </FormField>

        <FormField label="Courier Success Rate (min %)">
          <FormInput
            type="number"
            min={0}
            max={100}
            value={values.courierScoreMin ?? ''}
            onChange={(e) => patch({ courierScoreMin: e.target.value || undefined })}
            placeholder="e.g. 80"
          />
        </FormField>

        <FormField label="Customer Tag">
          <FormSearchSelect
            value={values.customerTag ?? ''}
            onChange={(customerTag) => patch({ customerTag: customerTag || undefined })}
            options={tagOptions}
            placeholder={tagOptions.length ? 'All tags' : 'No tags yet'}
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

        <FormField label="Order Amount (Min)">
          <FormInput
            type="number"
            min={0}
            value={values.amountMin ?? ''}
            onChange={(e) => patch({ amountMin: e.target.value || undefined })}
            placeholder="Min spent"
          />
        </FormField>

        <FormField label="Order Amount (Max)">
          <FormInput
            type="number"
            min={0}
            value={values.amountMax ?? ''}
            onChange={(e) => patch({ amountMax: e.target.value || undefined })}
            placeholder="Max spent"
          />
        </FormField>
      </div>
  );

  const footer = (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={onClear}>
        Reset
      </Button>
      <Label className="text-xs text-muted-foreground">
        Amount filters use customer lifetime spent.
      </Label>
    </div>
  );

  if (variant === 'popover') {
    return (
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-3 py-2.5 sm:px-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Advanced Filters</p>
            <p className="text-[11px] text-muted-foreground">
              {pinned
                ? 'Pinned — close with × or click outside'
                : 'Hover to peek · click Filters to pin'}
            </p>
          </div>
          {onClose ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              onClick={onClose}
              aria-label="Close filters"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
          {fields}
        </div>
        <div className="shrink-0 border-t border-border/70 bg-muted/20 px-3 py-2.5 sm:px-4">
          {footer}
        </div>
      </div>
    );
  }

  return (
    <CollapsibleSection title="Filtering" defaultOpen>
      {fields}
      <div className="mt-3">{footer}</div>
    </CollapsibleSection>
  );
}
