'use client';

import { Search } from 'lucide-react';

import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { cn } from '@/lib/utils';

type ProductListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  categoryOptions: { value: string; label: string }[];
  onCategoryChange: (value: string) => void;
  brandId: string;
  brandOptions: { value: string; label: string }[];
  onBrandChange: (value: string) => void;
  className?: string;
};

export function ProductListToolbar({
  search,
  onSearchChange,
  category,
  categoryOptions,
  onCategoryChange,
  brandId,
  brandOptions,
  onBrandChange,
  className,
}: ProductListToolbarProps) {
  return (
    <div className={cn('grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,12rem)_minmax(10rem,12rem)]', className)}>
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <FormInput
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, SKU, supplier, tag…"
          className="pl-9"
        />
      </div>
      <FormSearchSelect
        value={category}
        onChange={onCategoryChange}
        options={[{ value: '', label: 'All categories' }, ...categoryOptions]}
        searchable={false}
      />
      <FormSearchSelect
        value={brandId}
        onChange={onBrandChange}
        options={[{ value: '', label: 'All brands' }, ...brandOptions]}
        searchable={false}
      />
    </div>
  );
}
