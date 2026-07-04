'use client';

import * as React from 'react';
import type { TransactionListQuery, TransactionListResponse } from '@laam/types';

import { accountingApi } from '@/features/accounting/api/accounting-api';

type ListFn = (query: TransactionListQuery) => Promise<TransactionListResponse>;

export function useTransactionList(listFn: ListFn, query: TransactionListQuery, listVersion = 0) {
  const [data, setData] = React.useState<TransactionListResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const queryKey = JSON.stringify(query);

  const fetchList = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await listFn(query));
    } catch {
      setError('Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  }, [listFn, queryKey]);

  React.useEffect(() => {
    void fetchList();
  }, [fetchList, listVersion]);

  return { data, isLoading, error, refresh: fetchList };
}

export function useIncomesList(query: TransactionListQuery, listVersion = 0) {
  return useTransactionList(accountingApi.listIncome.bind(accountingApi), query, listVersion);
}

export function useExpensesList(query: TransactionListQuery, listVersion = 0) {
  return useTransactionList(accountingApi.listExpenses.bind(accountingApi), query, listVersion);
}

export function useLedgerList(query: TransactionListQuery, listVersion = 0) {
  return useTransactionList(accountingApi.listLedger.bind(accountingApi), query, listVersion);
}
