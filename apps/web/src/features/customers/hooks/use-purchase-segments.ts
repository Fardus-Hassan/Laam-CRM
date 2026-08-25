'use client';

import * as React from 'react';
import type { OrgCustomerPurchaseSegment } from '@laam/types';

import { orgCustomerPurchaseSegmentsApi } from '@/features/settings/api/org-customer-purchase-segments-api';
import {
  getPurchaseSegments,
  PURCHASE_SEGMENTS_CHANGED,
  setServerPurchaseSegments,
} from '@/features/customers/data/purchase-segments-store';

const useApi = process.env.NEXT_PUBLIC_USE_API === 'true';

let hydratePromise: Promise<void> | null = null;
let hydrateOrganizationId: string | null = null;

export function ensurePurchaseSegmentsHydrated(
  organizationId?: string | null,
): Promise<void> {
  if (!useApi) return Promise.resolve();
  if (
    organizationId &&
    hydrateOrganizationId &&
    organizationId !== hydrateOrganizationId
  ) {
    hydratePromise = null;
    hydrateOrganizationId = organizationId;
  } else if (organizationId && !hydrateOrganizationId) {
    hydrateOrganizationId = organizationId;
  }
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const list = await orgCustomerPurchaseSegmentsApi.list();
      setServerPurchaseSegments(list);
    } catch {
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

export function usePurchaseSegments() {
  const [version, setVersion] = React.useState(0);
  const [loading, setLoading] = React.useState(
    () => useApi && getPurchaseSegments() === undefined,
  );

  React.useEffect(() => {
    function onChange() {
      setVersion((v) => v + 1);
    }
    window.addEventListener(PURCHASE_SEGMENTS_CHANGED, onChange);
    return () => window.removeEventListener(PURCHASE_SEGMENTS_CHANGED, onChange);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void ensurePurchaseSegmentsHydrated().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  void version;
  return {
    segments: getPurchaseSegments() as OrgCustomerPurchaseSegment[],
    loading,
    refresh: async () => {
      const list = await orgCustomerPurchaseSegmentsApi.list();
      setServerPurchaseSegments(list);
    },
  };
}
