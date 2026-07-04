'use client';

import * as React from 'react';
import { Filter, Search, X } from 'lucide-react';
import type { OrderSource } from '@laam/types';

import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { Button } from '@/components/ui/button';
import { LEAD_SOURCE_LABELS } from '@/features/leads/config/lead-filters';
import { LEAD_AGENTS } from '@/features/leads/data/mock-leads';
import { cn } from '@/lib/utils';

export type LeadFilterValues = {
  source?: OrderSource;
  agent?: string;
};

export const EMPTY_LEAD_FILTERS: LeadFilterValues = {};

const SOURCE_OPTIONS = (Object.keys(LEAD_SOURCE_LABELS) as OrderSource[]).map((source) => ({
  id: source,
  label: LEAD_SOURCE_LABELS[source],
}));

type LeadListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filters: LeadFilterValues;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  onSourceChange: (source: OrderSource | undefined) => void;
  onAgentChange: (agent: string | undefined) => void;
  className?: string;
};

export function LeadListToolbar({
  search,
  onSearchChange,
  filters,
  filtersOpen,
  onToggleFilters,
  onClearFilters,
  onSourceChange,
  onAgentChange,
  className,
}: LeadListToolbarProps) {
  const hasActiveFilters = Boolean(filters.source || filters.agent);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <FormInput
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search lead ID, name, phone, campaign, agent…"
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
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Source:</span>
        <Button
          type="button"
          size="sm"
          variant={!filters.source ? 'secondary' : 'outline'}
          className="h-7 px-2.5 text-xs"
          onClick={() => onSourceChange(undefined)}
        >
          All
        </Button>
        {SOURCE_OPTIONS.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant={filters.source === option.id ? 'secondary' : 'outline'}
            className="h-7 px-2.5 text-xs"
            onClick={() => onSourceChange(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {filtersOpen ? (
        <div className="rounded-lg border bg-muted/20 p-3">
          <FormSearchSelect
            value={filters.agent ?? ''}
            onChange={(value) => onAgentChange(value || undefined)}
            options={LEAD_AGENTS.map((name) => ({ value: name, label: name }))}
            placeholder="Filter by agent"
          />
        </div>
      ) : null}

      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-2">
          {filters.source ? (
            <FilterChip
              label={LEAD_SOURCE_LABELS[filters.source]}
              onRemove={() => onSourceChange(undefined)}
            />
          ) : null}
          {filters.agent ? (
            <FilterChip label={filters.agent} onRemove={() => onAgentChange(undefined)} />
          ) : null}
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearFilters}>
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs">
      {label}
      <button type="button" onClick={onRemove} className="rounded-full p-0.5 hover:bg-muted">
        <X className="size-3" />
      </button>
    </span>
  );
}
