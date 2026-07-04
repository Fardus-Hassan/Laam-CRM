'use client';

import type { StockStatus } from '@laam/types';

import { Badge } from '@/components/ui/badge';
import { STOCK_STATUS_LABELS } from '@/features/inventory/config/product-filters';
import { cn } from '@/lib/utils';

const VARIANT: Record<StockStatus, string> = {
  in_stock: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  low_stock: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  out_of_stock: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

export function StockStatusBadge({
  status,
  className,
}: {
  status: StockStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn('text-[10px] font-medium', VARIANT[status], className)}>
      {STOCK_STATUS_LABELS[status]}
    </Badge>
  );
}
