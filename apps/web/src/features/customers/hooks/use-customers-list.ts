'use client';

import type { CustomerListQuery } from '@laam/types';

import { customersApi } from '@/features/customers/api/customers-api';
import { customerListCache } from '@/features/customers/data/customer-query-cache';
import { useTtlList } from '@/lib/use-ttl-list';

export function useCustomersList(query: CustomerListQuery, listVersion = 0) {
  return useTtlList({
    query,
    version: listVersion,
    cache: customerListCache,
    fetcher: (q) => customersApi.listCustomers(q),
    errorMessage: 'Failed to load customers.',
  });
}
