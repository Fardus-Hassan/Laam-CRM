'use client';

import { AuthProvider } from '@/features/auth/providers/auth-provider';
import { BrandProvider } from '@/features/brand/providers/brand-provider';
import { ThemeProvider } from '@/features/theme/providers/theme-provider';
import { DashboardDateProvider } from '@/features/dashboard/providers/dashboard-date-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <BrandProvider>
        <DashboardDateProvider>
          <AuthProvider>{children}</AuthProvider>
        </DashboardDateProvider>
      </BrandProvider>
    </ThemeProvider>
  );
}
