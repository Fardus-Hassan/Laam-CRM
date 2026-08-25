'use client';

import type { ProductListQuery } from '@laam/types';

import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { productListCache } from '@/features/inventory/data/product-query-cache';
import { useTtlList } from '@/lib/use-ttl-list';

export function useProductsList(query: ProductListQuery, listVersion = 0) {
  return useTtlList({
    query,
    version: listVersion,
    cache: productListCache,
    fetcher: (q) => inventoryApi.listProducts(q),
    errorMessage: 'Failed to load products.',
  });
}
