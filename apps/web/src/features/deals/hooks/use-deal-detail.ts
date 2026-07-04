'use client';

import * as React from 'react';
import type { DealDetail, PipelineResponse } from '@laam/types';

import { dealsApi } from '@/features/deals/api/deals-api';

export function useDealDetail(id: string) {
  const [data, setData] = React.useState<DealDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void dealsApi.getDeal(id).then(
      (deal) => {
        if (!cancelled) {
          setData(deal);
          setIsLoading(false);
          if (!deal) setError('Deal not found.');
        }
      },
      () => {
        if (!cancelled) {
          setError('Failed to load deal.');
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

export function usePipeline() {
  const [data, setData] = React.useState<PipelineResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void dealsApi.getPipeline().then(
      (response) => {
        if (!cancelled) {
          setData(response);
          setIsLoading(false);
        }
      },
      () => {
        if (!cancelled) {
          setError('Failed to load pipeline.');
          setIsLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}
