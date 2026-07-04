'use client';

import * as React from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import type { OrderListProductPreview } from '@laam/types';

import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

function ProductThumb({ imageUrl, name }: { imageUrl?: string; name: string }) {
  const [failed, setFailed] = React.useState(false);

  if (!imageUrl || failed) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground">
        <Package className="size-3.5" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      className="size-8 shrink-0 rounded border border-border object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export function DataTableProductList({
  orderNumber,
  orderHref,
  products,
  className,
  maxItems = 2,
  compact = false,
}: {
  orderNumber: string;
  orderHref: string;
  products: OrderListProductPreview[];
  className?: string;
  maxItems?: number;
  compact?: boolean;
}) {
  const displayId = orderNumber.replace(/^ORD-/, '');
  const visible = products.slice(0, maxItems);
  const hiddenCount = Math.max(0, products.length - maxItems);

  return (
    <div className={cn('space-y-1.5', className)}>
      <Link
        href={orderHref}
        className="inline-flex items-center text-sm font-semibold text-primary hover:underline"
      >
        #{displayId}
      </Link>
      <div className={cn('space-y-1', compact && 'space-y-0.5')}>
        {visible.map((product, index) => (
          <div
            key={`${product.name}-${index}`}
            className="flex items-start gap-2"
          >
            <ProductThumb imageUrl={product.imageUrl} name={product.name} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-xs leading-snug font-medium">{product.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {formatCurrency(product.price)}
                </span>
                {!compact ? (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto px-0 py-0 text-[10px]"
                  >
                    Stock
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {hiddenCount > 0 ? (
          <p className="text-[10px] text-muted-foreground">+{hiddenCount} more item(s)</p>
        ) : null}
      </div>
    </div>
  );
}
