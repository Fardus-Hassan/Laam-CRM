'use client';

import * as React from 'react';
import type { CustomerStatus } from '@laam/types';
import { toast } from 'sonner';

import { customersApi } from '@/features/customers/api/customers-api';

export function useCustomerMutations() {
  const [isLoading, setIsLoading] = React.useState(false);

  const updateCustomer = React.useCallback(
    async (customerId: string, patch: Parameters<typeof customersApi.updateCustomer>[1]) => {
      setIsLoading(true);
      try {
        const customer = await customersApi.updateCustomer(customerId, patch);
        toast.success('Customer updated');
        return customer;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Update failed');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const bulkAction = React.useCallback(
    async (payload: Parameters<typeof customersApi.bulkAction>[0]) => {
      setIsLoading(true);
      try {
        const result = await customersApi.bulkAction(payload);
        toast.success(result.message ?? `Updated ${result.successCount} customer(s)`);
        return result;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Bulk action failed');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { isLoading, updateCustomer, bulkAction };
}

export function useCustomerDetailMutations(
  customerId: string | null,
  onUpdated?: (customer: Awaited<ReturnType<typeof customersApi.getCustomer>>) => void,
) {
  const { updateCustomer, isLoading } = useCustomerMutations();

  const saveNotes = React.useCallback(
    async (notes: string) => {
      if (!customerId) return;
      const updated = await updateCustomer(customerId, { notes });
      onUpdated?.(updated);
    },
    [customerId, onUpdated, updateCustomer],
  );

  const changeStatus = React.useCallback(
    async (status: CustomerStatus) => {
      if (!customerId) return;
      const updated = await updateCustomer(customerId, { status });
      onUpdated?.(updated);
    },
    [customerId, onUpdated, updateCustomer],
  );

  return { isLoading, saveNotes, changeStatus, updateCustomer };
}
