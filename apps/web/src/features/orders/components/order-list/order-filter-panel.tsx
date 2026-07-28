'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { TenantUser } from '@laam/types';

import { CollapsibleSection } from '@/components/form/collapsible-section';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormSelect } from '@/components/form/form-select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { OrderListQuery, OrderSource, PaymentStatus, OrderStatusType } from '@laam/types';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { getOrderStatusSelectOptions } from '@/features/orders/lib/order-status-hierarchy';
import { ordersApi } from '@/features/orders/api/orders-api';
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
import { rbacApi } from '@/features/rbac/api/rbac-api';
import { DateRangePicker } from '@/components/date-range/date-range-picker';
import {
  detectDateRangePreset,
  presetToOrderQuery,
  rangeFromISO,
  resolvePresetToRange,
  type DateRangePresetId,
} from '@/lib/date-range';
import { cn } from '@/lib/utils';

export type OrderFilterValues = Pick<
  OrderListQuery,
  | 'source'
  | 'employee'
  | 'district'
  | 'excludeDistrict'
  | 'excludeStatus'
  | 'excludeSource'
  | 'excludeCourier'
  | 'paymentStatus'
  | 'courier'
  | 'courierStatusSlug'
  | 'product'
  | 'productId'
  | 'amountMin'
  | 'amountMax'
  | 'pathaoCity'
  | 'pathaoZone'
  | 'noteStatus'
  | 'dateRange'
  | 'dateFrom'
  | 'dateTo'
  | 'courierDateRange'
  | 'courierDateFrom'
  | 'courierDateTo'
> & { status?: OrderStatusType };

const EMPTY_FILTERS: OrderFilterValues = {
  source: undefined,
  employee: undefined,
  district: undefined,
  excludeDistrict: undefined,
  excludeStatus: undefined,
  excludeSource: undefined,
  excludeCourier: undefined,
  paymentStatus: undefined,
  courier: undefined,
  courierStatusSlug: undefined,
  product: undefined,
  productId: undefined,
  amountMin: undefined,
  amountMax: undefined,
  pathaoCity: undefined,
  pathaoZone: undefined,
  noteStatus: undefined,
  dateRange: 'all_time',
  dateFrom: undefined,
  dateTo: undefined,
  courierDateRange: 'all_time',
  courierDateFrom: undefined,
  courierDateTo: undefined,
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
  const [teamUsers, setTeamUsers] = React.useState<TenantUser[]>([]);
  const [courierStatusOptions, setCourierStatusOptions] = React.useState<
    Array<{ value: string; label: string }>
  >(() =>
    buildCourierStatusFilterOptions([], []).map((o) => ({ value: o.value, label: o.label })),
  );
  const [districtOptions, setDistrictOptions] = React.useState<
    Array<{ value: string; label: string }>
  >([]);
  const [pathaoCityOptions, setPathaoCityOptions] = React.useState<
    Array<{ value: string; label: string }>
  >([]);
  const [pathaoZoneOptions, setPathaoZoneOptions] = React.useState<
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
        if (cancelled) return;
        setDistrictOptions(opts.districts ?? []);
        setPathaoCityOptions(opts.pathaoCities ?? []);
        setPathaoZoneOptions(opts.pathaoZones ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setDistrictOptions([]);
        setPathaoCityOptions([]);
        setPathaoZoneOptions([]);
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
            value: product.id,
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

  function patch(next: Partial<OrderFilterValues>) {
    onChange({ ...values, ...next });
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

  const statusOptions = getOrderStatusSelectOptions();

  const sourceOptions = Object.entries(ORDER_SOURCE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const employeeOptions = teamUsers.map((u) => ({
    value: u.name,
    label: u.email ? `${u.name} · ${u.email}` : u.name,
  }));

  return (
    <CollapsibleSection title="Filtering" defaultOpen={false}>
      <div className={cn('grid sm:grid-cols-2 lg:grid-cols-4', ORDER_SECTION_GRID_GAP)}>
        <FormField label="Order Created At">
          <DateRangePicker
            align="start"
            className="w-full"
            placeholder="All Time"
            value={
              rangeFromISO(values.dateFrom, values.dateTo) ??
              (values.dateRange &&
              values.dateRange !== 'all_time' &&
              values.dateRange !== 'custom'
                ? resolvePresetToRange(values.dateRange as DateRangePresetId)
                : undefined)
            }
            preset={(values.dateRange as DateRangePresetId) ?? 'all_time'}
            onChange={(range) => {
              const preset = detectDateRangePreset(range);
              const q = presetToOrderQuery(preset, range);
              patch({
                dateRange: q.dateRange as OrderFilterValues['dateRange'],
                dateFrom: q.dateFrom,
                dateTo: q.dateTo,
              });
            }}
          />
        </FormField>
        <FormField label="Courier Submitted At">
          <DateRangePicker
            align="start"
            className="w-full"
            placeholder="All Time"
            value={
              rangeFromISO(values.courierDateFrom, values.courierDateTo) ??
              (values.courierDateRange &&
              values.courierDateRange !== 'all_time' &&
              values.courierDateRange !== 'custom'
                ? resolvePresetToRange(values.courierDateRange as DateRangePresetId)
                : undefined)
            }
            preset={(values.courierDateRange as DateRangePresetId) ?? 'all_time'}
            onChange={(range) => {
              const preset = detectDateRangePreset(range);
              const q = presetToOrderQuery(preset, range);
              patch({
                courierDateRange: q.dateRange as OrderFilterValues['courierDateRange'],
                courierDateFrom: q.dateFrom,
                courierDateTo: q.dateTo,
              });
            }}
          />
        </FormField>
        {!hideStatus ? (
          <FormField label="Status">
            <div className="space-y-1.5">
              <FormSearchSelect
                value={values.status ?? ''}
                onChange={(status) =>
                  patch({ status: (status || undefined) as OrderStatusType | undefined })
                }
                options={statusOptions}
                placeholder="All"
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={Boolean(values.excludeStatus)}
                  onCheckedChange={(checked) =>
                    patch({ excludeStatus: checked === true ? true : undefined })
                  }
                  disabled={!values.status}
                />
                Exclude this status
              </label>
            </div>
          </FormField>
        ) : null}
        <FormField label="Order Source">
          <div className="space-y-1.5">
            <FormSearchSelect
              value={values.source ?? ''}
              onChange={(source) =>
                patch({ source: (source || undefined) as OrderSource | undefined })
              }
              options={sourceOptions}
              placeholder="All"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={Boolean(values.excludeSource)}
                onCheckedChange={(checked) =>
                  patch({ excludeSource: checked === true ? true : undefined })
                }
                disabled={!values.source}
              />
              Exclude this source
            </label>
          </div>
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
          <div className="space-y-1.5">
            <FormSearchSelect
              value={values.district ?? ''}
              onChange={(district) => patch({ district: district || undefined })}
              options={districtOptions}
              placeholder={districtOptions.length ? 'All' : 'No districts yet'}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={Boolean(values.excludeDistrict)}
                onCheckedChange={(checked) =>
                  patch({ excludeDistrict: checked === true ? true : undefined })
                }
                disabled={!values.district}
              />
              Exclude this district
            </label>
          </div>
        </FormField>
        <FormField label="Courier">
          <div className="space-y-1.5">
            <FormSelect
              value={values.courier ?? ''}
              onChange={(courier) => patch({ courier: courier || undefined })}
              options={[
                { value: '', label: 'All' },
                { value: 'pathao', label: 'Pathao' },
                { value: 'carrybee', label: 'Carrybee' },
              ]}
              placeholder="All"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={Boolean(values.excludeCourier)}
                onCheckedChange={(checked) =>
                  patch({ excludeCourier: checked === true ? true : undefined })
                }
                disabled={!values.courier}
              />
              Exclude this courier
            </label>
          </div>
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
            options={[{ value: '', label: 'All' }, ...courierStatusOptions]}
            placeholder="All"
            searchPlaceholder="Search Pathao or Carrybee…"
          />
        </FormField>
        <FormField label="Pathao city">
          <FormSearchSelect
            value={values.pathaoCity ?? ''}
            onChange={(pathaoCity) => patch({ pathaoCity: pathaoCity || undefined })}
            options={pathaoCityOptions}
            placeholder={pathaoCityOptions.length ? 'All' : 'No Pathao cities yet'}
          />
        </FormField>
        <FormField label="Pathao zone">
          <FormSearchSelect
            value={values.pathaoZone ?? ''}
            onChange={(pathaoZone) => patch({ pathaoZone: pathaoZone || undefined })}
            options={pathaoZoneOptions}
            placeholder={pathaoZoneOptions.length ? 'All' : 'No Pathao zones yet'}
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
        <FormField label="Order note">
          <FormSelect
            value={values.noteStatus ?? 'all'}
            onChange={(noteStatus) =>
              patch({
                noteStatus:
                  noteStatus === 'all'
                    ? undefined
                    : (noteStatus as 'has_note' | 'no_note'),
              })
            }
            options={[
              { value: 'all', label: 'All' },
              { value: 'has_note', label: 'Has note' },
              { value: 'no_note', label: 'No note' },
            ]}
            searchable={false}
          />
        </FormField>
        <FormField label="Amount min">
          <FormInput
            type="number"
            min={0}
            value={values.amountMin ?? ''}
            onChange={(event) =>
              patch({
                amountMin:
                  event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
            placeholder="0"
          />
        </FormField>
        <FormField label="Amount max">
          <FormInput
            type="number"
            min={0}
            value={values.amountMax ?? ''}
            onChange={(event) =>
              patch({
                amountMax:
                  event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
            placeholder="Any"
          />
        </FormField>
        <FormField label="Product (catalog)" className="sm:col-span-2">
          <FormSearchSelect
            value={values.productId ?? ''}
            onChange={(productId) =>
              patch({
                productId: productId || undefined,
                product: undefined,
              })
            }
            options={productOptions}
            placeholder="Select product…"
          />
        </FormField>
        <FormField label="Product name contains" className="sm:col-span-2">
          <FormInput
            value={values.product ?? ''}
            onChange={(event) =>
              patch({
                product: event.target.value || undefined,
                productId: undefined,
              })
            }
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
