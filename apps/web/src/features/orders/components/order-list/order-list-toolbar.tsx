'use client';

import * as React from 'react';
import { ChevronUp, Filter, Search } from 'lucide-react';

import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { FormInput } from '@/components/form/form-input';
import { Button } from '@/components/ui/button';
import {
  OrderFilterPanel,
  type OrderFilterValues,
} from '@/features/orders/components/order-list/order-filter-panel';
import { OrderSavedViewsMenu } from '@/features/orders/components/order-list/order-saved-views-menu';
import { ORDER_SOURCE_LABELS } from '@/features/orders/config/order-status';
import { getStatusConfigBySlug } from '@/features/orders/data/mock-status-config';
import { cn } from '@/lib/utils';

type OrderListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filters: OrderFilterValues;
  onClearFilters: () => void;
  onRemoveFilter: (key: keyof OrderFilterValues) => void;
  onFiltersChange: (values: OrderFilterValues) => void;
  onApplySavedView?: (filters: OrderFilterValues, search?: string) => void;
  hideStatusFilter?: boolean;
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
  onClearFilters,
  onRemoveFilter,
  onFiltersChange,
  onApplySavedView,
  hideStatusFilter,
  className,
}: OrderListToolbarProps) {
  const chips = buildActiveFilterChips(filters, hideStatusFilter);
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
    // Portaled pickers/dropdowns (date range, combobox, etc.)
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
      // Nested date/select popovers own the interaction — never dismiss filters mid-pick.
      if (
        document.querySelector('[data-slot="popover-content"][data-state="open"]')
      ) {
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
        // Let open popovers handle Esc first; only close filters if none are open.
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
    if (
      document.querySelector('[data-slot="popover-content"][data-state="open"]')
    ) {
      // Moving into a portaled calendar/select — pin so it stays open.
      pinPanel();
      return;
    }
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    closeTimerRef.current = setTimeout(() => setHovered(false), 160);
  }

  /** Open/pin only — never toggle-close (close via ×, Esc, or outside). */
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
                {/* Mobile backdrop — only when pinned/open on small screens */}
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
                    /* Mobile: bottom sheet */
                    'fixed inset-x-0 bottom-0 max-h-[min(92vh,52rem)] overflow-hidden rounded-t-2xl border border-b-0 bg-background shadow-2xl',
                    /* Desktop: floating panel; pt bridge keeps hover across the gap */
                    'sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:max-h-[min(85vh,52rem)]',
                    'sm:w-[min(64rem,calc(100vw-1.5rem))] sm:border-0 sm:bg-transparent sm:pt-1.5 sm:shadow-none',
                  )}
                  onMouseEnter={() => {
                    // Working inside the panel — stick it open (no hover-dismiss).
                    if (!pinned) pinPanel();
                  }}
                  onPointerDownCapture={() => {
                    if (!pinned) pinPanel();
                  }}
                >
                  <div className="max-h-[inherit] overflow-hidden sm:rounded-xl sm:border sm:bg-background sm:shadow-2xl">
                    <OrderFilterPanel
                      variant="popover"
                      values={filters}
                      search={search}
                      hideStatus={hideStatusFilter}
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
          {onApplySavedView ? (
            <OrderSavedViewsMenu onApply={onApplySavedView} className="shrink-0" />
          ) : null}
        </div>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <FormInput
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by order ID, customer, phone, product…"
            aria-label="Search orders"
            className={cn(
              'h-8 border-border bg-background pl-8 text-xs text-foreground',
              'placeholder:text-muted-foreground shadow-none',
            )}
          />
        </div>
      </div>

      <ActiveFilterChips
        chips={chips.map((chip) => ({ id: chip.key, label: chip.label }))}
        onRemove={(id) => onRemoveFilter(id as keyof OrderFilterValues)}
        onClearAll={onClearFilters}
      />
    </div>
  );
}
