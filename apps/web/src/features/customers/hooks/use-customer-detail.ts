'use client';

import * as React from 'react';
import type { CustomerDetail } from '@laam/types';

import { customersApi } from '@/features/customers/api/customers-api';

export function useCustomerDetail(customerId: string) {
  const [data, setData] = React.useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [version, setVersion] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void customersApi.getCustomer(customerId).then(
      (customer) => {
        if (!cancelled) {
          setData(customer);
          setIsLoading(false);
          if (!customer) setError('Customer not found.');
        }
      },
      () => {
        if (!cancelled) {
          setError('Failed to load customer.');
          setIsLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [customerId, version]);

  return {
    data,
    isLoading,
    error,
    refresh: async () => {
      const customer = await customersApi.getCustomer(customerId);
      setData(customer);
      setVersion((v) => v + 1);
      return customer;
    },
  };
}
