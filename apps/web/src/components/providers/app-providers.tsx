'use client';

import { Toaster } from 'sonner';

import { CommandPaletteProvider } from '@/components/command-palette/command-palette-provider';
import { AuthProvider } from '@/features/auth/providers/auth-provider';
import { BrandProvider } from '@/features/brand/providers/brand-provider';
import { ThemeProvider } from '@/features/theme/providers/theme-provider';
import { DashboardDateProvider } from '@/features/dashboard/providers/dashboard-date-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <BrandProvider>
        <DashboardDateProvider>
          <AuthProvider>
            <CommandPaletteProvider>
              {children}
            </CommandPaletteProvider>
            <Toaster richColors position="top-right" closeButton />
          </AuthProvider>
        </DashboardDateProvider>
      </BrandProvider>
    </ThemeProvider>
  );
}
