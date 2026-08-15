'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import {
  clampCrmPageSize,
  CRM_MAX_PAGE_SIZE,
  CRM_PAGE_SIZE_OPTIONS,
  parseCrmPageSizeInput,
} from '@/components/data-table/page-size-options';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type CrmPageSizeControlProps = {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
  /** Compact density for tight bars (meta / footer). */
  size?: 'sm' | 'md';
  className?: string;
  /** Accessible name for the control. */
  'aria-label'?: string;
};

/**
 * Rows-per-page control: preset list + free number input (Enter to apply).
 * Max page size is {@link CRM_MAX_PAGE_SIZE}.
 */
export function CrmPageSizeControl({
  pageSize,
  onPageSizeChange,
  options = [...CRM_PAGE_SIZE_OPTIONS],
  size = 'sm',
  className,
  'aria-label': ariaLabel = 'Rows per page',
}: CrmPageSizeControlProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(String(pageSize));
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setDraft(String(pageSize));
      // Focus after open animation so Enter works immediately.
      const id = window.requestAnimationFrame(() => inputRef.current?.select());
      return () => window.cancelAnimationFrame(id);
    }
    return undefined;
  }, [open, pageSize]);

  const presets = React.useMemo(() => {
    const base = [...options];
    if (!base.includes(pageSize)) {
      base.push(pageSize);
      base.sort((a, b) => a - b);
    }
    return base;
  }, [options, pageSize]);

  function applySize(next: number) {
    const clamped = clampCrmPageSize(next, pageSize);
    if (clamped !== pageSize) onPageSizeChange(clamped);
    setOpen(false);
  }

  function commitDraft() {
    const parsed = parseCrmPageSizeInput(draft);
    if (parsed == null) {
      setDraft(String(pageSize));
      return;
    }
    applySize(parsed);
  }

  const triggerHeight = size === 'sm' ? 'h-8' : 'h-9';

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <span className="hidden sm:inline">Rows</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              triggerHeight,
              'min-w-[4.25rem] justify-between gap-1 px-2 font-medium tabular-nums text-foreground',
            )}
            aria-label={ariaLabel}
          >
            <span>{pageSize}</span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[11.5rem] p-2"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Custom (1–{CRM_MAX_PAGE_SIZE.toLocaleString()})
              </span>
              <Input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitDraft();
                  }
                }}
                className="h-8 text-sm tabular-nums"
                aria-label="Custom rows per page"
              />
            </label>
            <p className="text-[10px] text-muted-foreground">Press Enter to apply</p>
            <div
              className="custom-scrollbar max-h-44 space-y-0.5 overflow-y-auto overscroll-contain pr-0.5"
              role="listbox"
              aria-label="Preset page sizes"
            >
              {presets.map((n) => {
                const active = n === pageSize;
                return (
                  <button
                    key={n}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => applySize(n)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted',
                    )}
                  >
                    <span className="font-medium tabular-nums">{n}</span>
                    <span
                      className={cn(
                        'text-[10px]',
                        active ? 'text-primary-foreground/80' : 'text-muted-foreground',
                      )}
                    >
                      rows
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
