'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { accountingApi } from '@/features/accounting/api/accounting-api';

export function useAccountingMutations() {
  const [isLoading, setIsLoading] = React.useState(false);

  async function createIncome(payload: Parameters<typeof accountingApi.createIncome>[0]) {
    setIsLoading(true);
    try {
      const item = await accountingApi.createIncome(payload);
      toast.success(`Income ৳${item.amount.toLocaleString()} recorded`);
      return item;
    } finally {
      setIsLoading(false);
    }
  }

  async function createExpense(payload: Parameters<typeof accountingApi.createExpense>[0]) {
    setIsLoading(true);
    try {
      const item = await accountingApi.createExpense(payload);
      toast.success(`Expense ৳${item.amount.toLocaleString()} recorded`);
      return item;
    } finally {
      setIsLoading(false);
    }
  }

  return { createIncome, createExpense, isLoading };
}
