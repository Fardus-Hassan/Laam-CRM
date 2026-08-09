'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ActiveFilterChip = {
  /** Stable id for React key + remove handler */
  id: string;
  label: string;
};

type ActiveFilterChipsProps = {
  chips: ActiveFilterChip[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  className?: string;
  clearLabel?: string;
};

/**
 * Removable active-filter pills + Clear all — same pattern as Orders Advanced Filters.
 */
export function ActiveFilterChips({
  chips,
  onRemove,
  onClearAll,
  className,
  clearLabel = 'Clear all',
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs text-foreground"
          onClick={() => onRemove(chip.id)}
        >
          {chip.label}
          <X className="size-3" />
        </button>
      ))}
      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearAll}>
        {clearLabel}
      </Button>
    </div>
  );
}
