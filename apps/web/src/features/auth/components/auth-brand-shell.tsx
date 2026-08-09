'use client';

import * as React from 'react';

import { BrandLogo } from '@/components/brand/brand-logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { AuthWaveDots } from '@/features/auth/components/auth-wave-dots';
import { useBrand } from '@/features/brand/providers/brand-provider';
import { useTheme } from '@/features/theme/hooks/use-theme';
import { cn } from '@/lib/utils';

type AuthBrandShellProps = {
  children: React.ReactNode;
  /** Form column heading */
  title: string;
  /** Short supporting line under the title */
  subtitle?: string;
  /** Optional content below the form (links, host hints) */
  footer?: React.ReactNode;
  className?: string;
};

function relativeLuma(hex: string): number {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return 0.5;
  const r = Number.parseInt(raw.slice(0, 2), 16) / 255;
  const g = Number.parseInt(raw.slice(2, 4), 16) / 255;
  const b = Number.parseInt(raw.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Split-panel branded chrome for login / forgot / OTP pages. */
export function AuthBrandShell({
  children,
  title,
  subtitle,
  footer,
  className,
}: AuthBrandShellProps) {
  const brand = useBrand();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const panelBase = isDark ? brand.colors.sidebarBgDark : brand.colors.primaryDark;
  const panelFg = relativeLuma(panelBase) > 0.55 ? '#14201a' : '#f7faf8';
  const panelMuted = relativeLuma(panelBase) > 0.55 ? 'rgba(20,32,26,0.72)' : 'rgba(247,250,248,0.78)';

  return (
    <div className={cn('relative flex min-h-screen w-full bg-background', className)}>
      {/* Brand panel — desktop */}
      <aside
        className="relative hidden w-[46%] max-w-xl shrink-0 flex-col justify-between overflow-hidden p-10 text-left lg:flex xl:w-[42%] xl:p-12"
        style={{
          background: [
            `radial-gradient(900px 520px at 0% 0%, ${brand.colors.accent}33, transparent 55%)`,
            `radial-gradient(700px 480px at 100% 100%, ${brand.colors.primary}55, transparent 50%)`,
            `linear-gradient(155deg, ${panelBase} 0%, ${brand.colors.primary} 72%, ${brand.colors.primaryDark} 100%)`,
          ].join(', '),
          color: panelFg,
        }}
      >
        <AuthWaveDots />

        <div className="relative z-10 animate-in fade-in duration-500">
          <BrandLogo
            priority
            variant="dark"
            width={220}
            height={72}
            className="max-h-[4.5rem] w-auto object-contain object-left"
            iconClassName="size-10 text-current"
          />
        </div>

        <div className="relative z-10 max-w-md animate-in fade-in slide-in-from-bottom-2 duration-700">
          <p className="text-3xl font-semibold tracking-tight xl:text-4xl">{brand.name}</p>
          <p className="mt-3 text-base leading-relaxed" style={{ color: panelMuted }}>
            Sign in to manage orders, inventory, and your team — in one workspace.
          </p>
        </div>

        <p className="relative z-10 text-xs" style={{ color: panelMuted }}>
          Secured workspace · {brand.name}
        </p>
      </aside>

      {/* Form column */}
      <main className="relative flex min-h-screen flex-1 flex-col">
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>

        {/* Mobile brand strip */}
        <div
          className="flex items-center gap-3 border-b border-border/60 px-5 py-4 lg:hidden"
          style={{
            background: `linear-gradient(90deg, color-mix(in oklab, ${brand.colors.primary} 14%, transparent), transparent)`,
          }}
        >
          <BrandLogo
            priority
            width={140}
            height={40}
            className="max-h-9 w-auto object-contain object-left"
            iconClassName="size-7 text-primary"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">{brand.name}</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-[24rem] animate-in fade-in slide-in-from-right-2 duration-500">
            <header className="mb-8 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
                {title}
              </h1>
              {subtitle ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
              ) : null}
            </header>

            <div className="space-y-6">{children}</div>

            {footer ? (
              <div className="mt-8 space-y-2 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
