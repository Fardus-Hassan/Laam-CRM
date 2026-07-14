'use client';

import * as React from 'react';

import { BrandLogo } from '@/components/brand/brand-logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useBrand } from '@/features/brand/providers/brand-provider';
import { useTheme } from '@/features/theme/hooks/use-theme';
import { cn } from '@/lib/utils';

type AuthBrandShellProps = {
  children: React.ReactNode;
  subtitle?: string;
  className?: string;
};

/** Shared branded chrome for login / forgot / OTP pages. */
export function AuthBrandShell({ children, subtitle, className }: AuthBrandShellProps) {
  const brand = useBrand();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const wash = isDark ? brand.colors.surfaceDark : brand.colors.surfaceLight;
  const logoPanelBg = isDark
    ? `color-mix(in oklab, ${brand.colors.sidebarBgDark} 92%, black)`
    : `color-mix(in oklab, ${brand.colors.sidebarBgLight} 88%, white)`;

  return (
    <div
      className={cn(
        'relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10',
        className,
      )}
      style={{
        background: [
          `radial-gradient(1100px 520px at 8% -8%, ${brand.colors.primary}${isDark ? '40' : '28'}, transparent 58%)`,
          `radial-gradient(800px 420px at 100% 0%, ${brand.colors.accent}${isDark ? '28' : '1f'}, transparent 52%)`,
          `linear-gradient(165deg, ${wash}, hsl(var(--background)))`,
        ].join(', '),
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40"
        style={{
          background: `linear-gradient(180deg, ${brand.colors.primary}${isDark ? '33' : '18'}, transparent)`,
        }}
        aria-hidden
      />

      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 mb-8 flex w-full max-w-md flex-col items-center text-center">
        <div
          className="mb-5 rounded-2xl border border-border/50 px-8 py-5 shadow-lg backdrop-blur-md"
          style={{ background: logoPanelBg }}
        >
          <BrandLogo priority width={200} height={64} className="max-h-16" />
        </div>
        <p className="text-xl font-semibold tracking-tight text-foreground">{brand.name}</p>
        {subtitle ? (
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

