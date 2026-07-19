'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ProductFilterCount } from '@laam/types';

import { cn } from '@/lib/utils';

type ProductFilterChipsProps = {
  filters: ProductFilterCount[];
  activeFilterId: string;
  className?: string;
};

export function ProductFilterChips({ filters, activeFilterId, className }: ProductFilterChipsProps) {
  const searchParams = useSearchParams();

  return (
    <div
      className={cn(
        'custom-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 sm:flex-wrap sm:overflow-visible',
        className,
      )}
    >
      {filters.map((filter) => {
        const isActive = filter.id === activeFilterId;
        const params = new URLSearchParams(searchParams.toString());
        params.delete('page');
        if (filter.id !== 'all') params.set('filter', filter.id);
        else params.delete('filter');
        const href = params.toString()
          ? `/dashboard/inventory/products?${params.toString()}`
          : '/dashboard/inventory/products';

        return (
          <Link
            key={filter.id}
            href={href}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {filter.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                isActive ? 'bg-primary-foreground/20' : 'bg-muted',
              )}
            >
              {filter.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
