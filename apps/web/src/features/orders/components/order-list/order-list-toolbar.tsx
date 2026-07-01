'use client';

import * as React from 'react';
import { Filter, Search, X } from 'lucide-react';

import { FormInput } from '@/components/form/form-input';
import { Button } from '@/components/ui/button';
import type { OrderFilterValues } from '@/features/orders/components/order-list/order-filter-panel';
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
      label: getStatusConfigBySlug(filters.status)?.label ?? filters.status,
    });
  }
  if (filters.source) {
    chips.push({ key: 'source', label: ORDER_SOURCE_LABELS[filters.source] });
  }
  if (filters.employee) {
    chips.push({ key: 'employee', label: filters.employee });
  }
  if (filters.district) {
    chips.push({ key: 'district', label: filters.district });
  }
  if (filters.paymentStatus) {
    chips.push({ key: 'paymentStatus', label: filters.paymentStatus.toUpperCase() });
  }
  if (filters.courier) {
    chips.push({ key: 'courier', label: filters.courier });
  }
  if (filters.product) {
    chips.push({ key: 'product', label: `Product: ${filters.product}` });
  }
  if (filters.dateRange && filters.dateRange !== 'last_30') {
    chips.push({ key: 'dateRange', label: filters.dateRange.replace('_', ' ') });
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
  hideStatusFilter,
  className,
}: OrderListToolbarProps) {
  const chips = buildActiveFilterChips(filters, hideStatusFilter);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <FormInput
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search orders by ID, phone, name, address…"
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant={filtersOpen ? 'secondary' : 'outline'}
          size="sm"
          className="shrink-0"
          onClick={onToggleFilters}
        >
          <Filter className="size-4" />
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
