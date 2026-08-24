'use client';

import * as React from 'react';
import { ChevronUp, Download, Filter, Search } from 'lucide-react';

import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { FormInput } from '@/components/form/form-input';
import { Button } from '@/components/ui/button';
import {
  buildActiveFilterChips,
  CustomerFilterPanel,
  type CustomerFilterValues,
} from '@/features/customers/components/customer-list/customer-filter-panel';
import { cn } from '@/lib/utils';

type CustomerListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filters: CustomerFilterValues;
  onClearFilters: () => void;
  onRemoveFilter: (key: keyof CustomerFilterValues) => void;
  onFiltersChange: (values: CustomerFilterValues) => void;
  onExport?: () => void;
  className?: string;
};

function useFineHover() {
  const [fineHover, setFineHover] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setFineHover(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return fineHover;
}

export function CustomerListToolbar({
  search,
  onSearchChange,
  filters,
  onClearFilters,
  onRemoveFilter,
  onFiltersChange,
  onExport,
  className,
}: CustomerListToolbarProps) {
  const chips = buildActiveFilterChips(filters);
  const fineHover = useFineHover();
  const [pinned, setPinned] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const openTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const isOpen = pinned || hovered;

  const clearTimers = React.useCallback(() => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    openTimerRef.current = null;
    closeTimerRef.current = null;
  }, []);

  const closeAll = React.useCallback(() => {
    clearTimers();
    setPinned(false);
    setHovered(false);
  }, [clearTimers]);

  const isInsideFilterUi = React.useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    if (rootRef.current?.contains(target)) return true;
    if (
      target.closest(
        '[data-slot="popover-content"], [data-radix-popper-content-wrapper], [data-slot="dropdown-menu-content"], [role="listbox"], [data-slot="dialog-content"]',
      )
    ) {
      return true;
    }
    return false;
  }, []);

  React.useEffect(() => () => clearTimers(), [clearTimers]);

  React.useEffect(() => {
    if (!pinned) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (document.querySelector('[data-slot="popover-content"][data-state="open"]')) {
        return;
      }
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      const hit = path.find((node) => node instanceof Element) ?? event.target;
      if (!isInsideFilterUi(hit)) {
        closeAll();
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        const openPopover = document.querySelector(
          '[data-slot="popover-content"][data-state="open"]',
        );
        if (openPopover) return;
        closeAll();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pinned, closeAll, isInsideFilterUi]);

  function pinPanel() {
    clearTimers();
    setHovered(false);
    setPinned(true);
  }

  function handleHoverEnter() {
    if (!fineHover || pinned) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    openTimerRef.current = setTimeout(() => setHovered(true), 90);
  }

  function handleHoverLeave(event: React.MouseEvent) {
    if (!fineHover || pinned) return;
    if (isInsideFilterUi(event.relatedTarget)) return;
    if (document.querySelector('[data-slot="popover-content"][data-state="open"]')) {
      pinPanel();
      return;
    }
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    closeTimerRef.current = setTimeout(() => setHovered(false), 160);
  }

  function handleFilterClick() {
    pinPanel();
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-2">
          <div
            ref={rootRef}
            className="relative shrink-0"
            onMouseEnter={handleHoverEnter}
            onMouseLeave={handleHoverLeave}
          >
            <Button
              type="button"
              variant={isOpen ? 'secondary' : 'outline'}
              size="sm"
              className="h-8 w-full sm:w-auto"
              onClick={handleFilterClick}
              aria-expanded={isOpen}
              aria-haspopup="dialog"
            >
              <Filter className="size-3.5" />
              Filters
              {chips.length > 0 ? (
                <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-xs tabular-nums">
                  {chips.length}
                </span>
              ) : null}
              {isOpen ? <ChevronUp className="ml-0.5 size-3.5 opacity-70" /> : null}
            </Button>

            {isOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Dismiss filters"
                  className={cn(
                    'fixed inset-0 z-40 bg-black/40 sm:hidden',
                    !pinned && 'pointer-events-none opacity-0',
                  )}
                  onClick={closeAll}
                />

                <div
                  role="dialog"
                  aria-label="Advanced filters"
                  className={cn(
                    'z-50 animate-in fade-in-0 zoom-in-95 duration-150',
                    'fixed inset-x-0 bottom-0 max-h-[min(92vh,52rem)] overflow-hidden rounded-t-2xl border border-b-0 bg-background shadow-2xl',
                    'sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:max-h-[min(85vh,52rem)]',
                    'sm:w-[min(64rem,calc(100vw-1.5rem))] sm:border-0 sm:bg-transparent sm:pt-1.5 sm:shadow-none',
                  )}
                  onMouseEnter={() => {
                    if (!pinned) pinPanel();
                  }}
                  onPointerDownCapture={() => {
                    if (!pinned) pinPanel();
                  }}
                >
                  <div className="max-h-[inherit] overflow-hidden sm:rounded-xl sm:border sm:bg-background sm:shadow-2xl">
                    <CustomerFilterPanel
                      variant="popover"
                      values={filters}
                      pinned={pinned}
                      onChange={onFiltersChange}
                      onClear={onClearFilters}
                      onClose={closeAll}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>
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
      </div>

      <ActiveFilterChips
        chips={chips.map((chip) => ({ id: chip.key, label: chip.label }))}
        onRemove={(id) => onRemoveFilter(id as keyof CustomerFilterValues)}
        onClearAll={onClearFilters}
      />
    </div>
  );
}
