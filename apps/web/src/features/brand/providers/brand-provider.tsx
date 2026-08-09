'use client';

import * as React from 'react';
import type { PublicTenantBrand } from '@laam/types';

import { env } from '@/config/env';
import {
  DEFAULT_BRAND,
  brandColorsToCssVars,
  mergeBrandFromPublic,
  resolveBrandColors,
  type BrandConfig,
} from '@/config/brand';
import { SessionBootScreen } from '@/features/auth/components/session-boot-screen';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { BrandDocumentMeta } from '@/features/brand/components/brand-document-meta';
import { SuspendedTenantScreen } from '@/features/brand/components/suspended-tenant-screen';
import { UnknownTenantScreen } from '@/features/brand/components/unknown-tenant-screen';
import { getTenantSlugFromHost } from '@/lib/tenant';

type BrandBootStatus = 'loading' | 'ready' | 'unknown_tenant' | 'suspended_tenant';

function readErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.code === 'string') {
    return record.code;
  }
  if (record.message && typeof record.message === 'object') {
    const nested = record.message as Record<string, unknown>;
    if (typeof nested.code === 'string') {
      return nested.code;
    }
  }
  return undefined;
}

type BrandContextValue = {
  brand: BrandConfig;
  setBrand: (brand: BrandConfig) => void;
  bootStatus: BrandBootStatus;
};

const BrandContext = React.createContext<BrandContextValue | null>(null);

function applyBrandCss(brand: BrandConfig) {
  const vars = brandColorsToCssVars(brand.colors);
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  return () => {
    Object.keys(vars).forEach((key) => {
      root.style.removeProperty(key);
    });
  };
}

/** Keep a ready UI mounted — flipping back to loading remounts the app and breaks hooks. */
function markLoading(setBootStatus: React.Dispatch<React.SetStateAction<BrandBootStatus>>) {
  setBootStatus((prev) => (prev === 'ready' ? prev : 'loading'));
}

type BrandProviderProps = {
  children: React.ReactNode;
  brand?: BrandConfig;
};

export function BrandProvider({ children, brand: brandProp }: BrandProviderProps) {
  const { organization, status: authStatus } = useAuth();
  const tenantSlug = getTenantSlugFromHost();
  const needsPublicTenantBrand = Boolean(tenantSlug && env.useApi);
  const needsPublicPlatformBrand = Boolean(!tenantSlug && env.useApi);

  const [brand, setBrand] = React.useState<BrandConfig>(brandProp ?? DEFAULT_BRAND);
  const [bootStatus, setBootStatus] = React.useState<BrandBootStatus>(() =>
    brandProp || (!needsPublicTenantBrand && !needsPublicPlatformBrand) ? 'ready' : 'loading',
  );
  const [fetchFailed, setFetchFailed] = React.useState(false);
  const [retryKey, setRetryKey] = React.useState(0);

  React.useEffect(() => {
    if (brandProp) {
      setBrand(brandProp);
      setBootStatus('ready');
    }
  }, [brandProp]);

  // Authenticated: branding from session org (tenant or platform)
  React.useEffect(() => {
    if (authStatus !== 'authenticated' || !organization) {
      return;
    }
    if (organization.branding) {
      setBrand(
        mergeBrandFromPublic(
          {
            name: organization.name,
            slug: organization.slug,
            colors: resolveBrandColors(organization.branding.colors, organization.branding.colors),
            logos: {
              light: organization.branding.logos?.light,
              dark: organization.branding.logos?.dark,
              favicon: organization.branding.logos?.favicon,
            },
          },
          env.apiUrl,
        ),
      );
      setBootStatus('ready');
      setFetchFailed(false);
      return;
    }

    if (organization.slug === 'platform') {
      // Public platform fetch will fill branding — don't trap on loading.
      return;
    }

    setBrand({
      ...DEFAULT_BRAND,
      name: organization.name,
    });
    setBootStatus('ready');
    setFetchFailed(false);
  }, [authStatus, organization]);

  // Platform host (localhost): load Laam platform brand for login + dashboard
  React.useEffect(() => {
    if (brandProp) {
      return;
    }
    if (!needsPublicPlatformBrand) {
      return;
    }
    // Wait for session probe so auth loading→unauthenticated doesn't remount the tree.
    if (authStatus === 'loading') {
      return;
    }
    if (
      authStatus === 'authenticated' &&
      organization?.branding &&
      organization.slug === 'platform'
    ) {
      return;
    }
    if (authStatus === 'authenticated' && organization && organization.slug !== 'platform') {
      return;
    }

    let cancelled = false;
    markLoading(setBootStatus);
    setFetchFailed(false);

    void (async () => {
      try {
        const res = await fetch(`${env.apiUrl}/public/platform/branding`);
        if (cancelled) {
          return;
        }
        if (!res.ok) {
          setBrand({
            ...DEFAULT_BRAND,
            name: organization?.name ?? DEFAULT_BRAND.name,
          });
          setBootStatus('ready');
          setFetchFailed(false);
          return;
        }
        const data = (await res.json()) as PublicTenantBrand;
        setBrand(mergeBrandFromPublic(data, env.apiUrl));
        setBootStatus('ready');
        setFetchFailed(false);
      } catch {
        if (!cancelled) {
          setBrand({
            ...DEFAULT_BRAND,
            name: organization?.name ?? DEFAULT_BRAND.name,
          });
          setBootStatus('ready');
          setFetchFailed(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authStatus,
    organization,
    needsPublicPlatformBrand,
    brandProp,
    retryKey,
  ]);

  // Public tenant resolve (login / logged-out): block until brand loads or tenant missing
  React.useEffect(() => {
    if (brandProp) {
      return;
    }
    // Wait for session probe — otherwise auth settle remounts the app (hooks crash).
    if (authStatus === 'loading') {
      return;
    }
    if (authStatus === 'authenticated') {
      return;
    }
    if (!needsPublicTenantBrand || !tenantSlug) {
      if (!needsPublicPlatformBrand) {
        setBrand(DEFAULT_BRAND);
        setBootStatus('ready');
        setFetchFailed(false);
      }
      return;
    }

    let cancelled = false;
    markLoading(setBootStatus);
    setFetchFailed(false);

    void (async () => {
      try {
        const res = await fetch(
          `${env.apiUrl}/public/tenants/${encodeURIComponent(tenantSlug)}/branding`,
        );
        if (cancelled) {
          return;
        }
        if (res.status === 404) {
          setBootStatus('unknown_tenant');
          return;
        }
        if (res.status === 403) {
          const body = (await res.json().catch(() => null)) as unknown;
          if (readErrorCode(body) === 'ORG_SUSPENDED') {
            setBootStatus('suspended_tenant');
            return;
          }
        }
        if (!res.ok) {
          setFetchFailed(true);
          markLoading(setBootStatus);
          return;
        }
        const data = (await res.json()) as PublicTenantBrand;
        setBrand(mergeBrandFromPublic(data, env.apiUrl));
        setBootStatus('ready');
        setFetchFailed(false);
      } catch {
        if (!cancelled) {
          setFetchFailed(true);
          markLoading(setBootStatus);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authStatus,
    tenantSlug,
    needsPublicTenantBrand,
    needsPublicPlatformBrand,
    brandProp,
    retryKey,
  ]);

  React.useEffect(() => {
    if (bootStatus !== 'ready') {
      return;
    }
    return applyBrandCss(brand);
  }, [brand, bootStatus]);

  const value = React.useMemo(
    () => ({ brand, setBrand, bootStatus }),
    [brand, bootStatus],
  );

  // Always mount BrandDocumentMeta so the tab icon never snaps back to Next’s default.
  // Unknown / suspended replace the app. Loading overlays only until first ready —
  // after that we never remount children via loading flips (see markLoading).
  if (bootStatus === 'unknown_tenant' && tenantSlug) {
    return (
      <BrandContext.Provider value={value}>
        <BrandDocumentMeta />
        <UnknownTenantScreen slug={tenantSlug} />
      </BrandContext.Provider>
    );
  }

  if (bootStatus === 'suspended_tenant' && tenantSlug) {
    return (
      <BrandContext.Provider value={value}>
        <BrandDocumentMeta />
        <SuspendedTenantScreen slug={tenantSlug} />
      </BrandContext.Provider>
    );
  }

  if (bootStatus === 'loading') {
    return (
      <BrandContext.Provider value={value}>
        <BrandDocumentMeta />
        <SessionBootScreen
          message={
            fetchFailed
              ? 'Couldn’t reach the server. Check your connection.'
              : 'Loading your workspace…'
          }
          onRetry={
            fetchFailed
              ? () => {
                  setFetchFailed(false);
                  setBootStatus('loading');
                  setRetryKey((n) => n + 1);
                }
              : undefined
          }
        />
      </BrandContext.Provider>
    );
  }

  return (
    <BrandContext.Provider value={value}>
      <BrandDocumentMeta />
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = React.useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within BrandProvider.');
  }
  return context.brand;
}

export function useBrandControls() {
  const context = React.useContext(BrandContext);
  if (!context) {
    throw new Error('useBrandControls must be used within BrandProvider.');
  }
  return context;
}

export function useBrandBootStatus() {
  const context = React.useContext(BrandContext);
  if (!context) {
    throw new Error('useBrandBootStatus must be used within BrandProvider.');
  }
  return context.bootStatus;
}
