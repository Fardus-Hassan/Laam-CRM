'use client';

import * as React from 'react';
import { Plus, Sparkles } from 'lucide-react';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getOrderCatalogProducts,
  getProductById,
  searchProducts,
  type MockProduct,
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

function ProductRow({
  product,
  onAdd,
  highlight,
}: {
  product: MockProduct;
  onAdd: (id: string) => void;
  highlight?: 'hero' | 'upsell';
}) {
  const minPrice = Math.min(...product.variations.map((v) => v.unitPrice));

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-md border px-2 py-2 transition-colors hover:bg-muted/60',
        highlight === 'hero' && 'border-primary/40 bg-primary/5',
        highlight === 'upsell' && 'border-border/60',
        !highlight && 'border-transparent',
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        onClick={() => onAdd(product.id)}
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          className="size-11 shrink-0 rounded-md border border-border/60 object-cover"
          loading="lazy"
        />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-sm font-medium">{product.name}</p>
            {highlight === 'hero' ? (
              <Badge className="shrink-0 text-[10px]">Hero</Badge>
            ) : null}
          </span>
          <p className="text-xs text-muted-foreground">
            {product.sku} · {product.variations.map((v) => v.label).join(' / ')} · from{' '}
            {formatCurrency(minPrice)}
          </p>
        </span>
      </button>
      <Button
        type="button"
        size="icon"
        variant={highlight === 'hero' ? 'default' : 'outline'}
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
  const { addLineItemFromProduct, clearFieldError, state } = form;
  const [filter, setFilter] = React.useState('');

  const products = React.useMemo(() => searchProducts(filter), [filter]);
  const heroProducts = products.filter((p) => p.isHero);
  const upsellProducts = products.filter((p) => p.isUpsell && !p.isHero);
  const otherProducts = products.filter((p) => !p.isHero && !p.isUpsell);

  const hasHeroInCart = state.lineItems.some((line) => {
    const product = getProductById(line.productId);
    return product?.isHero;
  });

  function handleQuickAdd(productId: string) {
    const product = getProductById(productId);
    const variationId = product?.variations[0]?.id;
    addLineItemFromProduct(productId, variationId);
    clearFieldError('lineItems');
  }

  return (
    <Card className={cn('flex flex-col gap-0 py-0 shadow-none', className)}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">Product catalog</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Hero mix first — then add-ons (pink salt, beetroot, etc.)
        </p>
      </CardHeader>
      <CardContent className={cn('flex flex-col gap-2.5', ORDER_SECTION_BODY_CLASS)}>
        <FormField label="Search products">
          <FormInput
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by name or SKU"
          />
        </FormField>

        <div className="custom-scrollbar h-[420px] space-y-3 overflow-y-auto rounded-lg border border-border/70 p-2">
          {heroProducts.length > 0 ? (
            <div className="space-y-1">
              <p className="flex items-center gap-1 px-1 text-[11px] font-semibold tracking-wide text-primary uppercase">
                <Sparkles className="size-3" />
                Hero — Honey + Kalojira Mix
              </p>
              {heroProducts.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onAdd={handleQuickAdd}
                  highlight="hero"
                />
              ))}
            </div>
          ) : null}

          {upsellProducts.length > 0 ? (
            <div className="space-y-1">
              <p className="px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {hasHeroInCart ? 'Add-ons / upsell' : 'Also sell with mix'}
              </p>
              {upsellProducts.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onAdd={handleQuickAdd}
                  highlight="upsell"
                />
              ))}
            </div>
          ) : null}

          {otherProducts.length > 0 ? (
            <div className="space-y-1">
              <p className="px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Other
              </p>
              {otherProducts.map((product) => (
                <ProductRow key={product.id} product={product} onAdd={handleQuickAdd} />
              ))}
            </div>
          ) : null}

          {products.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No products match.</p>
          ) : null}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Showing {products.length} of {getOrderCatalogProducts().length} products · tap + or a row
          to add
        </p>
      </CardContent>
    </Card>
  );
}
