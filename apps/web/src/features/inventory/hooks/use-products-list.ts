'use client';

import * as React from 'react';
import type { ProductListQuery, ProductListResponse } from '@laam/types';

import { inventoryApi } from '@/features/inventory/api/inventory-api';

export function useProductsList(query: ProductListQuery, listVersion = 0) {
  const [data, setData] = React.useState<ProductListResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const queryKey = JSON.stringify(query);

  const fetchList = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await inventoryApi.listProducts(query);
      setData(response);
    } catch {
      setError('Failed to load products.');
    } finally {
      setIsLoading(false);
    }
  }, [queryKey]);

  React.useEffect(() => {
    void fetchList();
  }, [fetchList, listVersion]);

  return { data, isLoading, error, refresh: fetchList };
}
