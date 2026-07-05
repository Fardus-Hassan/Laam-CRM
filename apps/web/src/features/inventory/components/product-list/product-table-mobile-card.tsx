'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { InventoryProductListItem, ProductStatus } from '@laam/types';
import { Minus, Package, Plus } from 'lucide-react';

import type { CrmRowContext } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FormSelect } from '@/components/form/form-select';
import {
  resolveProductCategoryLabel,
  PRODUCT_STATUS_LABELS,
} from '@/features/inventory/config/product-filters';
import { StockStatusBadge } from '@/features/inventory/components/shared/stock-status-badge';
import { formatCurrency } from '@/lib/format';

type ProductTableMobileCardProps = {
  row: InventoryProductListItem;
  ctx: CrmRowContext<InventoryProductListItem>;
  onStatusChange?: (row: InventoryProductListItem, status: ProductStatus) => void;
  onStockAdjust?: (row: InventoryProductListItem, delta: number) => void;
  onDetailsClick?: (row: InventoryProductListItem) => void;
};

const STATUS_OPTIONS = (Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[]).map((value) => ({
  value,
  label: PRODUCT_STATUS_LABELS[value],
}));

export function ProductTableMobileCard({
  row,
  ctx,
  onStatusChange,
  onStockAdjust,
}: ProductTableMobileCardProps) {
  return (
    <div className="divide-y divide-border/60">
      <header className="flex items-start gap-3 p-4">
        <Checkbox
          checked={ctx.isSelected}
          onCheckedChange={(value) => ctx.toggleSelected(Boolean(value))}
          aria-label={`Select ${row.name}`}
          className="mt-1"
        />
        <div className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
          {row.imageUrl ? (
            <Image src={row.imageUrl} alt={row.name} fill className="object-cover" sizes="48px" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Package className="size-5 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <Link
            href={`/dashboard/inventory/products/${row.id}`}
            className="text-base font-semibold text-primary hover:underline"
          >
            {row.name}
          </Link>
          <p className="font-mono text-xs text-muted-foreground">{row.sku}</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px]">
              {resolveProductCategoryLabel(row.category)}
            </Badge>
            <StockStatusBadge status={row.stockStatus} />
          </div>
        </div>
      </header>

      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Stock</p>
            <div className="mt-1 flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-7"
                onClick={() => onStockAdjust?.(row, -1)}
              >
                <Minus className="size-3.5" />
              </Button>
              <span className="text-lg font-semibold tabular-nums">{row.stock}</span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-7"
                onClick={() => onStockAdjust?.(row, 1)}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Sale price</p>
            <p className="font-medium">{formatCurrency(row.salePriceMin)}</p>
          </div>
        </div>
        <FormSelect
          value={row.status}
          onChange={(value) => onStatusChange?.(row, value as ProductStatus)}
          options={STATUS_OPTIONS}
          searchable={false}
        />
        {row.supplierName ? (
          <p className="text-xs text-muted-foreground">Supplier: {row.supplierName}</p>
        ) : null}
      </div>

      <footer className="px-4 py-3">
        <Button type="button" size="sm" className="h-7" asChild>
          <Link href={`/dashboard/inventory/products/${row.id}`}>View product</Link>
        </Button>
      </footer>
    </div>
  );
}
