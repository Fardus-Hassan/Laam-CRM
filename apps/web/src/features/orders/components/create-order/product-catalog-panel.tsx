'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MOCK_PRODUCTS,
  getProductById,
  searchProducts,
} from '@/features/orders/data/mock-create-order';
import type { CreateOrderFormApi } from '@/features/orders/hooks/use-create-order-form';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';

type ProductCatalogPanelProps = {
  form: CreateOrderFormApi;
  className?: string;
};

export function ProductCatalogPanel({ form, className }: ProductCatalogPanelProps) {
  const { addLineItemFromProduct, clearFieldError } = form;
  const [filter, setFilter] = React.useState('');

  const products = React.useMemo(() => searchProducts(filter), [filter]);

  function handleQuickAdd(productId: string) {
    const product = getProductById(productId);
    const variationId = product?.variations[0]?.id;
    addLineItemFromProduct(productId, variationId);
    clearFieldError('lineItems');
  }

  return (
    <Card className={cn('flex flex-col gap-0 py-0 shadow-none', className)}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">Product Catalog</CardTitle>
      </CardHeader>
      <CardContent className={cn('flex flex-col gap-2.5', ORDER_SECTION_BODY_CLASS)}>
        <FormField label="Search products">
          <FormInput
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by name or SKU"
          />
        </FormField>

        <div className="custom-scrollbar h-[420px] space-y-1 overflow-y-auto rounded-lg border border-border/70 p-1">
          {products.map((product) => {
            const minPrice = Math.min(...product.variations.map((v) => v.unitPrice));

            return (
              <div
                key={product.id}
                className="flex items-center gap-2.5 rounded-md border border-transparent px-2 py-2 transition-colors hover:bg-muted/60"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  onClick={() => handleQuickAdd(product.id)}
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="size-11 shrink-0 rounded-md border border-border/60 object-cover"
                    loading="lazy"
                  />
                  <span className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.sku} · from {formatCurrency(minPrice)}
                    </p>
                  </span>
                </button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8 shrink-0"
                  onClick={() => handleQuickAdd(product.id)}
                  aria-label={`Add ${product.name}`}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Showing {products.length} of {MOCK_PRODUCTS.length} products · tap + or a row to add
        </p>
      </CardContent>
    </Card>
  );
}
