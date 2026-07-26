'use client';

import * as React from 'react';
import { Bookmark, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import type { OrderFilterPreset } from '@laam/types';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { OrderFilterValues } from '@/features/orders/components/order-list/order-filter-panel';
import {
  deleteOrderFilterPreset,
  loadOrderFilterPresets,
} from '@/features/orders/lib/order-filter-presets';

type OrderSavedViewsMenuProps = {
  onApply: (filters: OrderFilterValues, search?: string) => void;
  className?: string;
};

function presetToFilters(preset: OrderFilterPreset): OrderFilterValues {
  const f = preset.filters;
  return {
    source: f.source as OrderFilterValues['source'],
    employee: f.employee,
    district: f.district,
    excludeDistrict: f.excludeDistrict === 'true' ? true : undefined,
    excludeStatus: f.excludeStatus === 'true' ? true : undefined,
    excludeSource: f.excludeSource === 'true' ? true : undefined,
    excludeCourier: f.excludeCourier === 'true' ? true : undefined,
    paymentStatus: f.paymentStatus as OrderFilterValues['paymentStatus'],
    courier: f.courier,
    courierStatusSlug: f.courierStatusSlug,
    product: f.product,
    pathaoCity: f.pathaoCity,
    pathaoZone: f.pathaoZone,
    noteStatus: f.noteStatus as OrderFilterValues['noteStatus'],
    dateRange: (f.dateRange as OrderFilterValues['dateRange']) ?? 'all_time',
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
    courierDateRange: (f.courierDateRange as OrderFilterValues['courierDateRange']) ?? 'all_time',
    courierDateFrom: f.courierDateFrom,
    courierDateTo: f.courierDateTo,
    status: f.status as OrderFilterValues['status'],
  };
}

export function OrderSavedViewsMenu({ onApply, className }: OrderSavedViewsMenuProps) {
  const [presets, setPresets] = React.useState<OrderFilterPreset[]>([]);

  React.useEffect(() => {
    setPresets(loadOrderFilterPresets());
  }, []);

  function handleDelete(id: string, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setPresets(deleteOrderFilterPreset(id));
    toast.success('View removed');
  }

  if (presets.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={className}>
          <Bookmark className="size-4" />
          Saved views
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My saved views</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {presets.map((preset) => (
          <DropdownMenuItem
            key={preset.id}
            className="flex items-center justify-between gap-2"
            onClick={() => {
              onApply(presetToFilters(preset), preset.filters.search);
              toast.success(`Loaded "${preset.name}"`);
            }}
          >
            <span className="truncate">{preset.name}</span>
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground hover:text-destructive"
              onClick={(e) => handleDelete(preset.id, e)}
              aria-label={`Delete ${preset.name}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
