'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Minus, Package, Plus } from 'lucide-react';

import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import { StockStatusBadge } from '@/features/inventory/components/shared/stock-status-badge';
import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_STATUS_LABELS,
} from '@/features/inventory/config/product-filters';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { useProductMutations } from '@/features/inventory/hooks/use-product-mutations';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { InventoryProductDetail } from '@laam/types';

type ProductDetailViewProps = {
  productId: string;
};

export function ProductDetailView({ productId }: ProductDetailViewProps) {
  const { updateProduct } = useProductMutations();
  const [product, setProduct] = React.useState<InventoryProductDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const data = await inventoryApi.getProduct(productId);
    setProduct(data);
    setLoading(false);
  }, [productId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function adjustStock(delta: number) {
    if (!product) return;
    await updateProduct(product.id, {
      stockAdjustment: { delta, reason: 'Quick adjust from detail' },
    });
    void load();
  }

  if (loading) {
    return <p className="p-4 text-sm text-muted-foreground">Loading product…</p>;
  }

  if (!product) {
    return (
      <PageShell title="Product not found" description="This product may have been removed.">
        <Button type="button" variant="outline" asChild>
          <Link href="/dashboard/inventory/products">Back to products</Link>
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={product.name}
      description={`SKU ${product.sku}`}
      breadcrumbs={[
        { label: 'Inventory', href: '/dashboard/inventory/products' },
        { label: product.name },
      ]}
    >
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <InventorySubNav />
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/dashboard/inventory/products">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>

        <div className="grid min-w-0 gap-4 lg:grid-cols-3">
          <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 lg:col-span-2')}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Overview</CardTitle>
            </CardHeader>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative mx-auto size-24 shrink-0 overflow-hidden rounded-lg border bg-muted sm:mx-0">
                  {product.imageUrl ? (
                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="96px" />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Package className="size-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-2 text-center sm:text-left">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{PRODUCT_CATEGORY_LABELS[product.category]}</Badge>
                    <Badge variant="secondary">{PRODUCT_STATUS_LABELS[product.status]}</Badge>
                    <StockStatusBadge status={product.stockStatus} />
                  </div>
                  {product.description ? (
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  ) : null}
                  {product.supplierName ? (
                    <p className="text-sm">Supplier: <span className="font-medium">{product.supplierName}</span></p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Stock</CardTitle>
            </CardHeader>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              <div className="flex items-center justify-center gap-3">
                <Button type="button" size="icon" variant="outline" onClick={() => void adjustStock(-1)}>
                  <Minus className="size-4" />
                </Button>
                <span className="text-3xl font-bold tabular-nums">{product.stock}</span>
                <Button type="button" size="icon" variant="outline" onClick={() => void adjustStock(1)}>
                  <Plus className="size-4" />
                </Button>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Reorder at {product.reorderLevel} units
              </p>
              <p className="mt-3 text-center text-sm">
                Value ~ {formatCurrency(product.stock * (product.costPrice ?? product.salePriceMin * 0.6))}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Variants</CardTitle>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'p-0 sm:p-0')}>
            <div className="divide-y md:hidden">
              {product.variants.map((v) => (
                <div key={v.id} className="space-y-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{v.label}</p>
                    <span className="shrink-0 tabular-nums text-sm">{v.stock} in stock</span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{v.sku}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span>Sale {formatCurrency(v.salePrice)}</span>
                    <span className="text-muted-foreground">
                      Cost {v.costPrice ? formatCurrency(v.costPrice) : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto p-4 md:block">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Label</th>
                    <th className="pb-2 pr-4">SKU</th>
                    <th className="pb-2 pr-4">Sale</th>
                    <th className="pb-2 pr-4">Cost</th>
                    <th className="pb-2">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((v) => (
                    <tr key={v.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium">{v.label}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{v.sku}</td>
                      <td className="py-2 pr-4">{formatCurrency(v.salePrice)}</td>
                      <td className="py-2 pr-4">{v.costPrice ? formatCurrency(v.costPrice) : '—'}</td>
                      <td className="py-2 tabular-nums">{v.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {product.notes ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              <p className="text-sm">{product.notes}</p>
            </CardContent>
          </Card>
        ) : null}

        {product.activities.length > 0 ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Activity</CardTitle>
            </CardHeader>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              <ol className="space-y-2">
                {product.activities.map((a) => (
                  <li key={a.id} className="rounded-md border border-border/60 p-2 text-sm">
                    <p className="font-medium">{a.label}</p>
                    {a.description ? <p className="text-xs text-muted-foreground">{a.description}</p> : null}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
