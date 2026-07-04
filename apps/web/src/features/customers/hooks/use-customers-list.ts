'use client';

import * as React from 'react';
import type { CustomerListQuery, CustomerListResponse } from '@laam/types';

import { customersApi } from '@/features/customers/api/customers-api';

export function useCustomersList(query: CustomerListQuery, listVersion = 0) {
  const [data, setData] = React.useState<CustomerListResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const queryKey = JSON.stringify(query);
  const refreshKey = `${queryKey}:${listVersion}`;

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void customersApi.listCustomers(query).then(
      (response) => {
        if (!cancelled) {
          setData(response);
          setIsLoading(false);
        }
      },
      () => {
        if (!cancelled) {
          setError('Failed to load customers.');
          setIsLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return {
    data,
    isLoading,
    error,
    refresh: () => customersApi.listCustomers(query).then(setData),
  };
}
