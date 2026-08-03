'use client';

import * as React from 'react';
import { Download, Filter, Search } from 'lucide-react';

import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { FormInput } from '@/components/form/form-input';
import { Button } from '@/components/ui/button';
import {
  buildActiveFilterChips,
  type CustomerFilterValues,
} from '@/features/customers/components/customer-list/customer-filter-panel';
import { cn } from '@/lib/utils';

type CustomerListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filters: CustomerFilterValues;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  onRemoveFilter: (key: keyof CustomerFilterValues) => void;
  onExport?: () => void;
  className?: string;
};

export function CustomerListToolbar({
  search,
  onSearchChange,
  filters,
  filtersOpen,
  onToggleFilters,
  onClearFilters,
  onRemoveFilter,
  onExport,
  className,
}: CustomerListToolbarProps) {
  const chips = buildActiveFilterChips(filters);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <FormInput
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name, mobile, ID, product, tag, area…"
            aria-label="Search customers"
            className={cn(
              'h-8 border-border bg-background pl-8 text-xs text-foreground',
              'placeholder:text-muted-foreground shadow-none',
            )}
          />
        </div>
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
        {onExport ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0"
            onClick={onExport}
          >
            <Download className="size-3.5" />
            Export
          </Button>
        ) : null}
      </div>

      <ActiveFilterChips
        chips={chips.map((chip) => ({ id: chip.key, label: chip.label }))}
        onRemove={(id) => onRemoveFilter(id as keyof CustomerFilterValues)}
        onClearAll={onClearFilters}
      />
    </div>
  );
}
