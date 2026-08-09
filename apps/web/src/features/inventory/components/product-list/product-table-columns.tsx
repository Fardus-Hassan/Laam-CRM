'use client';

import Link from 'next/link';
import type { InventoryProductListItem, ProductStatus } from '@laam/types';
import { MessageSquarePlus, Minus, Package, Plus } from 'lucide-react';
import Image from 'next/image';

import type { CrmColumnDef } from '@/components/data-table';
import { Can } from '@/components/auth/can';
import { DataTableEmptyValue, TruncatedText } from '@/components/data-table/cells';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormSelect } from '@/components/form/form-select';
import {
  resolveProductCategoryLabel,
  PRODUCT_STATUS_LABELS,
} from '@/features/inventory/config/product-filters';
import { StockStatusBadge } from '@/features/inventory/components/shared/stock-status-badge';
import { formatCurrency } from '@/lib/format';

export const PRODUCT_TABLE_PINNED = {
  left: ['select', 'sl', 'product'],
  right: [] as string[],
};

const STATUS_OPTIONS = (Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[]).map((value) => ({
  value,
  label: PRODUCT_STATUS_LABELS[value],
}));

export function buildProductTableColumns(options?: {
  rowOffset?: number;
  onStatusChange?: (row: InventoryProductListItem, status: ProductStatus) => void;
  onStockAdjust?: (row: InventoryProductListItem, delta: number) => void;
  onDetailsClick?: (row: InventoryProductListItem) => void;
}): CrmColumnDef<InventoryProductListItem>[] {
  const rowOffset = options?.rowOffset ?? 0;

  return [
    {
      id: 'sl',
      header: 'SL',
      size: 44,
      meta: { label: 'SL', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{rowOffset + row.index + 1}</span>
      ),
    },
    {
      id: 'product',
      header: 'Product',
      size: 240,
      meta: { label: 'Product', priority: 'primary', align: 'top' },
      cell: ({ row }) => (
        <div className="flex gap-2">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
            {row.original.imageUrl ? (
              <Image
                src={row.original.imageUrl}
                alt={row.original.name}
                fill
                className="object-cover"
                sizes="40px"
                unoptimized={
                  row.original.imageUrl.startsWith('data:') ||
                  row.original.imageUrl.startsWith('/api/') ||
                  row.original.imageUrl.includes('localhost')
                }
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Package className="size-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-0.5">
            <button
              type="button"
              className="text-left font-medium text-primary hover:underline"
              onClick={() => options?.onDetailsClick?.(row.original)}
            >
              {row.original.name}
            </button>
            <p className="font-mono text-[10px] text-muted-foreground">{row.original.sku}</p>
            <div className="flex flex-wrap gap-1">
              {row.original.brandName ? (
                <Badge variant="secondary" className="text-[10px]">
                  {row.original.brandName}
                </Badge>
              ) : null}
              <Badge variant="outline" className="text-[10px]">
                {row.original.categoryLabel ?? resolveProductCategoryLabel(row.original.category)}
              </Badge>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'stock',
      header: 'Stock',
      size: 130,
      meta: { label: 'Stock', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Can permission="inventory.adjust">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-6"
                disabled={row.original.variantCount !== 1 || !row.original.primaryVariantId}
                title={
                  row.original.variantCount !== 1
                    ? 'Open product to adjust multi-variant stock'
                    : undefined
                }
                onClick={() => options?.onStockAdjust?.(row.original, -1)}
              >
                <Minus className="size-3" />
              </Button>
            </Can>
            <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">
              {row.original.stock}
            </span>
            <Can permission="inventory.adjust">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-6"
                disabled={row.original.variantCount !== 1 || !row.original.primaryVariantId}
                title={
                  row.original.variantCount !== 1
                    ? 'Open product to adjust multi-variant stock'
                    : undefined
                }
                onClick={() => options?.onStockAdjust?.(row.original, 1)}
              >
                <Plus className="size-3" />
              </Button>
            </Can>
          </div>
          <StockStatusBadge status={row.original.stockStatus} />
          <p className="text-[10px] text-muted-foreground">Reorder: {row.original.reorderLevel}</p>
        </div>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      size: 110,
      meta: { label: 'Price', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="font-medium">
            {row.original.salePriceMin === row.original.salePriceMax
              ? formatCurrency(row.original.salePriceMin)
              : `${formatCurrency(row.original.salePriceMin)} – ${formatCurrency(row.original.salePriceMax)}`}
          </p>
          {row.original.costPrice ? (
            <p className="text-muted-foreground">Cost {formatCurrency(row.original.costPrice)}</p>
          ) : null}
          <p className="text-muted-foreground">{row.original.variantCount} variant(s)</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      size: 120,
      meta: { label: 'Status', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <FormSelect
          value={row.original.status}
          onChange={(value) => options?.onStatusChange?.(row.original, value as ProductStatus)}
          options={STATUS_OPTIONS}
          searchable={false}
          className="h-8 min-w-[100px] text-xs"
        />
      ),
    },
    {
      id: 'supplier',
      header: 'Supplier',
      size: 140,
      meta: { label: 'Supplier', priority: 'secondary', align: 'top' },
      cell: ({ row }) =>
        row.original.supplierName ? (
          <TruncatedText className="text-xs">{row.original.supplierName}</TruncatedText>
        ) : (
          <DataTableEmptyValue />
        ),
    },
    {
      id: 'tags',
      header: 'Tags',
      size: 90,
      meta: { label: 'Tags', priority: 'secondary', align: 'middle' },
      cell: ({ row }) =>
        row.original.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          <DataTableEmptyValue />
        ),
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 90,
      meta: { label: 'Actions', priority: 'primary', align: 'middle' },
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
            <Link href={`/dashboard/inventory/products/${row.original.id}`}>View</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => options?.onDetailsClick?.(row.original)}
          >
            <MessageSquarePlus className="size-3" />
            Quick
          </Button>
        </div>
      ),
    },
  ];
}
