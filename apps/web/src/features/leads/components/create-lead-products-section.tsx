'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CreateLeadLinePayload } from '@laam/types';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getProductById,
  searchProducts,
} from '@/features/orders/data/mock-create-order';
import {
  ORDER_CARD_CLASS,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type DraftLineItem = CreateLeadLinePayload & { id: string };

type CreateLeadProductsSectionProps = {
  lineItems: DraftLineItem[];
  onChange: (items: DraftLineItem[]) => void;
  className?: string;
};

function nextId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function CreateLeadProductsSection({
  lineItems,
  onChange,
  className,
}: CreateLeadProductsSectionProps) {
  const [filter, setFilter] = React.useState('');
  const products = React.useMemo(() => searchProducts(filter), [filter]);

  const subtotal = lineItems.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  function addFromProduct(productId: string) {
    const product = getProductById(productId);
    const variation = product?.variations[0];
    if (!product || !variation) return;

    onChange([
      ...lineItems,
      {
        id: nextId(),
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        unitPrice: variation.unitPrice,
      },
    ]);
  }

  function updateLine(id: string, patch: Partial<DraftLineItem>) {
    onChange(
      lineItems.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(id: string) {
    onChange(lineItems.filter((line) => line.id !== id));
  }

  return (
    <div className={cn('grid gap-4 lg:grid-cols-[1fr_280px]', className)}>
      <Card className={cn(ORDER_CARD_CLASS, 'gap-0 py-0 shadow-none')}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Product catalog</CardTitle>
        </CardHeader>
        <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
          <FormField label="Search products">
            <FormInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name or SKU"
            />
          </FormField>
          <div className="custom-scrollbar max-h-[320px] space-y-1 overflow-y-auto rounded-lg border border-border/70 p-1">
            {products.map((product) => {
              const minPrice = Math.min(...product.variations.map((v) => v.unitPrice));
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/60"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => addFromProduct(product.id)}
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="size-10 shrink-0 rounded-md border object-cover"
                      loading="lazy"
                    />
                    <span className="min-w-0">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.sku} · from {formatCurrency(minPrice)}
                      </p>
                    </span>
                  </button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addFromProduct(product.id)}>
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className={cn(ORDER_CARD_CLASS, 'gap-0 py-0 shadow-none lg:col-span-2')}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Line items ({lineItems.length})</CardTitle>
        </CardHeader>
        <CardContent className={ORDER_SECTION_BODY_CLASS}>
          {lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add products from the catalog — optional for a pre-order lead.
            </p>
          ) : (
            <div className="space-y-2">
              {lineItems.map((line) => (
                <div
                  key={line.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{line.productName}</p>
                    {line.sku ? <p className="text-xs text-muted-foreground">{line.sku}</p> : null}
                  </div>
                  <FormInput
                    type="number"
                    min={1}
                    className="h-8 w-16"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.id, { quantity: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(line.unitPrice * line.quantity)}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => removeLine(line.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
              <p className="text-right text-sm font-semibold tabular-nums">
                Subtotal: {formatCurrency(subtotal)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export type { DraftLineItem };
