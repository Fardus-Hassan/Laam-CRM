'use client';

import * as React from 'react';
import { Filter, Search } from 'lucide-react';
import type { OrderSource } from '@laam/types';

import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { Button } from '@/components/ui/button';
import { LEAD_SOURCE_LABELS } from '@/features/leads/config/lead-filters';
import { useAgentOptions } from '@/features/rbac/hooks/use-agent-options';
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
  const { agents } = useAgentOptions();
  const hasActiveFilters = Boolean(filters.source || filters.agent);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <FormInput
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search lead ID, name, phone, campaign, agent…"
            className="pl-9"
          />
        </div>
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
            options={agents.map((name) => ({ value: name, label: name }))}
            placeholder="Filter by agent"
          />
        </div>
      ) : null}

      {hasActiveFilters ? (
        <ActiveFilterChips
          chips={[
            ...(filters.source
              ? [{ id: 'source', label: LEAD_SOURCE_LABELS[filters.source] }]
              : []),
            ...(filters.agent ? [{ id: 'agent', label: filters.agent }] : []),
          ]}
          onRemove={(id) => {
            if (id === 'source') onSourceChange(undefined);
            if (id === 'agent') onAgentChange(undefined);
          }}
          onClearAll={onClearFilters}
        />
      ) : null}
    </div>
  );
}
