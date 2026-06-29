'use client';

import * as React from 'react';
import type { LeadDetail } from '@laam/types';

import { leadsApi } from '@/features/leads/api/leads-api';

export function useLeadDetail(leadNumber: string) {
  const [data, setData] = React.useState<LeadDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void leadsApi.getLead(leadNumber).then(
      (lead) => {
        if (!cancelled) {
          setData(lead);
          setIsLoading(false);
          if (!lead) {
            setError('Lead not found.');
          }
        }
      },
      () => {
        if (!cancelled) {
          setError('Failed to load lead.');
          setIsLoading(false);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [leadNumber]);

  return { data, isLoading, error };
}
