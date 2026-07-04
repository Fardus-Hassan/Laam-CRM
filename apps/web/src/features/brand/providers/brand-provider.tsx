'use client';

import * as React from 'react';
import {
  DEFAULT_BRAND,
  brandColorsToCssVars,
  type BrandConfig,
} from '@/config/brand';

type BrandContextValue = {
  brand: BrandConfig;
};

const BrandContext = React.createContext<BrandContextValue | null>(null);

type BrandProviderProps = {
  children: React.ReactNode;
  /** Static default now; pass API-loaded config later for SaaS tenants. */
  brand?: BrandConfig;
};

export function BrandProvider({
  children,
  brand = DEFAULT_BRAND,
}: BrandProviderProps) {
  React.useEffect(() => {
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
  }, [brand]);

  const value = React.useMemo(() => ({ brand }), [brand]);

  return (
    <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
  );
}

export function useBrand() {
  const context = React.useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within BrandProvider.');
  }
  return context.brand;
}
