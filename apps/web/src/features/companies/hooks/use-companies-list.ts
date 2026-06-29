'use client';

import * as React from 'react';
import type { CompanyListQuery, CompanyListResponse } from '@laam/types';

import { companiesApi } from '@/features/companies/api/companies-api';

export function useCompaniesList(query: CompanyListQuery) {
  const [data, setData] = React.useState<CompanyListResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const queryKey = JSON.stringify(query);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void companiesApi.listCompanies(query).then(
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
  }, [queryKey]);

  return { data, isLoading, error };
}
