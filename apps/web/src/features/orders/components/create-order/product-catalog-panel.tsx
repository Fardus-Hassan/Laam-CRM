'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  CreateOrderFormApi,
  OrderCatalogProduct,
} from '@/features/orders/hooks/use-create-order-form';
import { useOrgCategoryOptions } from '@/features/settings/hooks/use-org-categories';
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

function ProductRow({
  product,
  onAdd,
}: {
  product: OrderCatalogProduct;
  onAdd: (id: string) => void;
}) {
  const minPrice = Math.min(...product.variations.map((v) => v.unitPrice));

  return (
    <div className="flex items-center gap-2.5 rounded-md border border-transparent px-2 py-2 transition-colors hover:bg-muted/60">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        onClick={() => onAdd(product.id)}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="size-11 shrink-0 rounded-md border border-border/60 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="size-11 shrink-0 rounded-md border border-border/60 bg-muted" />
        )}
        <span className="min-w-0">
          <p className="truncate text-sm font-medium">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {product.sku} · {product.variations.map((v) => v.label).join(' / ')} · from{' '}
            {formatCurrency(minPrice)}
          </p>
        </span>
      </button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-8 shrink-0"
        onClick={() => onAdd(product.id)}
        aria-label={`Add ${product.name}`}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

export function ProductCatalogPanel({ form, className }: ProductCatalogPanelProps) {
  const {
    addLineItemFromProduct,
    clearFieldError,
    state,
    patch,
    catalogProducts,
    catalogTotal,
    loadingCatalog,
  } = form;
  const categoryOptions = useOrgCategoryOptions('product');

  function handleQuickAdd(productId: string) {
    const product = catalogProducts.find((p) => p.id === productId);
    const variationId = product?.variations[0]?.id;
    void addLineItemFromProduct(productId, variationId);
    clearFieldError('lineItems');
  }

  return (
    <Card className={cn('flex flex-col gap-0 py-0 shadow-none', className)}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">Product catalog</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Search and filter by category — live inventory
        </p>
      </CardHeader>
      <CardContent className={cn('flex flex-col gap-2.5', ORDER_SECTION_BODY_CLASS)}>
        <div className="grid gap-2 sm:grid-cols-2">
          <FormField label="Category">
            <FormSelect
              value={state.catalogCategory}
              onChange={(catalogCategory) => patch({ catalogCategory })}
              options={[
                { value: '', label: 'All categories' },
                ...categoryOptions.map((c) => ({ value: c.value, label: c.label })),
              ]}
              placeholder="All categories"
            />
          </FormField>
          <FormField label="Search products">
            <FormInput
              value={state.catalogSearch}
              onChange={(event) => patch({ catalogSearch: event.target.value })}
              placeholder="Search by name or SKU"
            />
          </FormField>
        </div>

        <div className="custom-scrollbar h-[420px] space-y-1 overflow-y-auto rounded-lg border border-border/70 p-2">
          {loadingCatalog ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Searching…</p>
          ) : null}

          {!loadingCatalog
            ? catalogProducts.map((product) => (
                <ProductRow key={product.id} product={product} onAdd={handleQuickAdd} />
              ))
            : null}

          {!loadingCatalog && catalogProducts.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No products match.</p>
          ) : null}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Showing {catalogProducts.length} of {catalogTotal} · tap + or a row to add
        </p>
      </CardContent>
    </Card>
  );
}
