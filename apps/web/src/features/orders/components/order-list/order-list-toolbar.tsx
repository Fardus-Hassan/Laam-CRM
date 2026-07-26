'use client';

import * as React from 'react';
import { Filter, Search, X } from 'lucide-react';

import { FormInput } from '@/components/form/form-input';
import { Button } from '@/components/ui/button';
import type { OrderFilterValues } from '@/features/orders/components/order-list/order-filter-panel';
import { OrderSavedViewsMenu } from '@/features/orders/components/order-list/order-saved-views-menu';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { getStatusConfigBySlug } from '@/features/orders/data/mock-status-config';
import { cn } from '@/lib/utils';

type OrderListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filters: OrderFilterValues;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  onRemoveFilter: (key: keyof OrderFilterValues) => void;
  onApplySavedView?: (filters: OrderFilterValues, search?: string) => void;
  hideStatusFilter?: boolean;
  className?: string;
};

function buildActiveFilterChips(
  filters: OrderFilterValues,
  hideStatus?: boolean,
): { key: keyof OrderFilterValues; label: string }[] {
  const chips: { key: keyof OrderFilterValues; label: string }[] = [];

  if (!hideStatus && filters.status) {
    chips.push({
      key: 'status',
      label: `${filters.excludeStatus ? 'Not ' : ''}${getStatusConfigBySlug(filters.status)?.label ?? filters.status}`,
    });
  }
  if (filters.source) {
    chips.push({
      key: 'source',
      label: `${filters.excludeSource ? 'Not ' : ''}${ORDER_SOURCE_LABELS[filters.source]}`,
    });
  }
  if (filters.employee) {
    chips.push({ key: 'employee', label: filters.employee });
  }
  if (filters.district) {
    chips.push({
      key: 'district',
      label: `${filters.excludeDistrict ? 'Not ' : ''}${filters.district}`,
    });
  }
  if (filters.paymentStatus) {
    chips.push({ key: 'paymentStatus', label: filters.paymentStatus.toUpperCase() });
  }
  if (filters.courier) {
    chips.push({
      key: 'courier',
      label: `${filters.excludeCourier ? 'Not ' : ''}${filters.courier}`,
    });
  }
  if (filters.courierStatusSlug) {
    chips.push({ key: 'courierStatusSlug', label: filters.courierStatusSlug });
  }
  if (filters.pathaoCity) {
    chips.push({ key: 'pathaoCity', label: `City: ${filters.pathaoCity}` });
  }
  if (filters.pathaoZone) {
    chips.push({ key: 'pathaoZone', label: `Zone: ${filters.pathaoZone}` });
  }
  if (filters.noteStatus === 'has_note') {
    chips.push({ key: 'noteStatus', label: 'Has note' });
  }
  if (filters.noteStatus === 'no_note') {
    chips.push({ key: 'noteStatus', label: 'No note' });
  }
  if (filters.product) {
    chips.push({ key: 'product', label: `Product: ${filters.product}` });
  }
  if (filters.dateRange && filters.dateRange !== 'all_time') {
    const label =
      filters.dateFrom && filters.dateTo
        ? `Created ${filters.dateFrom} → ${filters.dateTo}`
        : `Created: ${filters.dateRange.replace(/_/g, ' ')}`;
    chips.push({ key: 'dateRange', label });
  }
  if (filters.courierDateRange && filters.courierDateRange !== 'all_time') {
    const label =
      filters.courierDateFrom && filters.courierDateTo
        ? `Courier ${filters.courierDateFrom} → ${filters.courierDateTo}`
        : `Courier: ${filters.courierDateRange.replace(/_/g, ' ')}`;
    chips.push({ key: 'courierDateRange', label });
  }

  return chips;
}

export function OrderListToolbar({
  search,
  onSearchChange,
  filters,
  filtersOpen,
  onToggleFilters,
  onClearFilters,
  onRemoveFilter,
  onApplySavedView,
  hideStatusFilter,
  className,
}: OrderListToolbarProps) {
  const chips = buildActiveFilterChips(filters, hideStatusFilter);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <FormInput
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search…"
            aria-label="Search orders"
            className={cn(
              'h-8 border-border bg-background pl-8 text-xs text-foreground',
              'placeholder:text-muted-foreground shadow-none',
            )}
          />
        </div>
        {onApplySavedView ? (
          <OrderSavedViewsMenu onApply={onApplySavedView} className="shrink-0" />
        ) : null}
        <Button
          type="button"
          variant={filtersOpen ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 shrink-0"
          onClick={onToggleFilters}
        >
          <Filter className="size-3.5" />
          Filters
          {chips.length > 0 ? (
            <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-xs tabular-nums">
              {chips.length}
            </span>
          ) : null}
        </Button>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs text-foreground"
              onClick={() => onRemoveFilter(chip.key)}
            >
              {chip.label}
              <X className="size-3" />
            </button>
          ))}
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearFilters}>
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
}
