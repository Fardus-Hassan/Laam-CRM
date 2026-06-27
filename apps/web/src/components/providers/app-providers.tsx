'use client';

import { AuthProvider } from '@/features/auth/providers/auth-provider';
import { BrandProvider } from '@/features/brand/providers/brand-provider';
import { ThemeProvider } from '@/features/theme/providers/theme-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <BrandProvider>
        <AuthProvider>{children}</AuthProvider>
      </BrandProvider>
    </ThemeProvider>
  );
}
