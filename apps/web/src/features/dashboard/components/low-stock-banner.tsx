'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';

import { getLowStockCount } from '@/features/inventory/data/mock-inventory';
import { Button } from '@/components/ui/button';

export function LowStockBanner() {
  const count = getLowStockCount();
  if (count <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Package className="size-4 text-amber-700 dark:text-amber-400" />
        <span>
          <strong className="tabular-nums">{count}</strong> product{count === 1 ? '' : 's'} low or out of stock
        </span>
      </div>
      <Button type="button" size="sm" variant="outline" asChild>
        <Link href="/dashboard/inventory/products?filter=low_stock">View products</Link>
      </Button>
    </div>
  );
}
