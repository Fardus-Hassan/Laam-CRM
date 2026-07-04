'use client';

import * as React from 'react';
import type { CompanyDetail } from '@laam/types';

import { companiesApi } from '@/features/companies/api/companies-api';

export function useCompanyDetail(id: string) {
  const [data, setData] = React.useState<CompanyDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void companiesApi.getCompany(id).then(
      (company) => {
        if (!cancelled) {
          setData(company);
          setIsLoading(false);
          if (!company) setError('Customer not found.');
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
  }, [id]);

  return { data, isLoading, error };
}
