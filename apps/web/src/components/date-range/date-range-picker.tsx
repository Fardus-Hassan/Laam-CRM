'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DATE_RANGE_PRESETS,
  detectDateRangePreset,
  formatDateRangeLabel,
  formatDateRangeLabelLong,
  resolvePresetToRange,
  type DateRangePresetId,
} from '@/lib/date-range';

type DateRangePickerProps = {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
  align?: 'start' | 'center' | 'end';
  numberOfMonths?: number;
  placeholder?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
  /** Show Max / All Time preset (default true). */
  allowAllTime?: boolean;
  /** Disable selecting future dates (default true). */
  disableFuture?: boolean;
  /** Optional controlled preset highlight. */
  preset?: DateRangePresetId;
  onPresetChange?: (preset: DateRangePresetId) => void;
};

export function DateRangePicker({
  value,
  onChange,
  className,
  align = 'end',
  numberOfMonths = 2,
  placeholder = 'All Time',
  variant = 'outline',
  size = 'sm',
  allowAllTime = true,
  disableFuture = true,
  preset: presetProp,
  onPresetChange,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(value);
  const [activePreset, setActivePreset] = React.useState<DateRangePresetId>(
    () => presetProp ?? detectDateRangePreset(value),
  );
  const isMobile = useIsMobile();
  const months = isMobile ? 1 : numberOfMonths;

  const presets = React.useMemo(
    () =>
      DATE_RANGE_PRESETS.filter((p) => allowAllTime || p.id !== 'all_time'),
    [allowAllTime],
  );

  React.useEffect(() => {
    if (!open) return;
    setDraft(value);
    setActivePreset(presetProp ?? detectDateRangePreset(value));
  }, [open, value, presetProp]);

  const label = value?.from ? formatDateRangeLabel(value) : placeholder;
  const footerLabel = formatDateRangeLabelLong(
    draft?.from && draft?.to ? draft : activePreset === 'all_time' ? undefined : draft,
  );

  function commit(next: DateRange | undefined, preset: DateRangePresetId) {
    setActivePreset(preset);
    onPresetChange?.(preset);
    onChange(next);
    setOpen(false);
  }

  function handlePresetClick(id: DateRangePresetId) {
    setActivePreset(id);
    if (id === 'custom') {
      setDraft(value?.from ? value : resolvePresetToRange('last_30'));
      return;
    }
    if (id === 'all_time') {
      commit(undefined, 'all_time');
      return;
    }
    commit(resolvePresetToRange(id), id);
  }

  function handleApply() {
    if (activePreset === 'custom') {
      if (!draft?.from || !draft.to) return;
      commit(draft, 'custom');
      return;
    }
    if (activePreset === 'all_time') {
      commit(undefined, 'all_time');
      return;
    }
    commit(resolvePresetToRange(activePreset), activePreset);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn(
            'w-full justify-start gap-2 font-normal text-foreground sm:w-auto',
            !value?.from && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-70" />
          <span className="truncate text-left">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-[calc(100vw-1rem)] p-0"
        align={isMobile ? 'center' : align}
      >
        <div className="flex flex-col sm:flex-row">
          <div className="flex max-h-72 flex-row gap-1 overflow-x-auto border-b p-2 sm:max-h-none sm:w-40 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={cn(
                  'shrink-0 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                  activePreset === preset.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted',
                )}
                onClick={() => handlePresetClick(preset.id)}
              >
                {preset.id === 'all_time' ? 'Max' : preset.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col">
            <Calendar
              mode="range"
              defaultMonth={draft?.from ?? value?.from ?? new Date()}
              selected={draft}
              onSelect={(range) => {
                setActivePreset('custom');
                setDraft(range);
              }}
              numberOfMonths={months}
              disabled={disableFuture ? { after: new Date() } : undefined}
            />
            <div className="flex flex-col gap-2 border-t px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">{footerLabel}</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApply}
                  disabled={activePreset === 'custom' && !(draft?.from && draft?.to)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
