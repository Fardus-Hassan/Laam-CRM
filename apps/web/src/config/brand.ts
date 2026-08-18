import type { BrandColors, BrandLogos, PublicTenantBrand } from '@laam/types';
import { normalizeBrandColorInput } from '@laam/types';

export type BrandConfig = {
  name: string;
  logos: {
    light: string;
    dark: string;
    favicon: string;
  };
  colors: BrandColors;
};

export const DEFAULT_BRAND: BrandConfig = {
  name: 'Laam',
  logos: {
    light: '/images/brand/white-mode-logo.png',
    dark: '/images/brand/logo.png',
    // Never use Next’s default /favicon.ico (black “N”) as a fallback.
    favicon: '/images/brand/logo.png',
  },
  colors: {
    primary: '#127A3B',
    primaryDark: '#0B4D2A',
    accent: '#FFD700',
    sidebarBgLight: '#FFFFFF',
    sidebarBgDark: '#0B4D2A',
    sidebarActiveBg: '#8CC63F',
    sidebarActiveFg: '#FFFFFF',
    sidebarFg: '#F6F9F6',
    surfaceLight: '#F6F9F6',
    surfaceDark: '#1E1E1E',
  },
};

/** Relative luma 0–1 for deciding light/dark text on a hex swatch. */
function relativeLuma(hex: string): number {
  const raw = hex.replace('#', '').trim();
  if (raw.length !== 3 && raw.length !== 6) return 0.5;
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return 0.5;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function contrastFg(bg: string, preferred: string): string {
  return relativeLuma(bg) > 0.55 ? '#1a1a1a' : preferred;
}

export function contrastOnBrandBg(
  bg: string,
  preferred: string = DEFAULT_BRAND.colors.sidebarFg,
): string {
  return contrastFg(bg, preferred);
}

export function resolveBrandColors(
  partial?: Partial<BrandColors> | null,
  legacy?: unknown,
): BrandColors {
  const normalized = normalizeBrandColorInput({
    ...(typeof legacy === 'object' && legacy ? legacy : {}),
    ...(partial ?? {}),
  });
  return {
    ...DEFAULT_BRAND.colors,
    ...(normalized ?? {}),
  };
}

export function brandColorsToCssVars(colors: BrandColors): Record<string, string> {
  const accentFg = relativeLuma(colors.accent) > 0.55 ? '#1a1a1a' : '#ffffff';
  return {
    '--brand-primary': colors.primary,
    '--brand-primary-dark': colors.primaryDark,
    '--brand-accent': colors.accent,
    '--brand-accent-fg': accentFg,
    '--brand-sidebar-bg-light': colors.sidebarBgLight,
    '--brand-sidebar-bg-dark': colors.sidebarBgDark,
    // Legacy single-token (dark) — kept for any leftover references
    '--brand-sidebar-bg': colors.sidebarBgDark,
    '--brand-sidebar-active-bg': colors.sidebarActiveBg,
    '--brand-sidebar-active-fg': colors.sidebarActiveFg,
    '--brand-sidebar-fg': colors.sidebarFg,
    '--brand-sidebar-fg-light': contrastFg(colors.sidebarBgLight, colors.sidebarFg),
    '--brand-sidebar-fg-dark': contrastFg(colors.sidebarBgDark, colors.sidebarFg),
    '--brand-surface-light': colors.surfaceLight,
    '--brand-surface-dark': colors.surfaceDark,
    // Chart companions — tinted from brand so series feel on-palette
    '--brand-chart-blue': `color-mix(in oklab, ${colors.primary} 35%, #3B82F6)`,
    '--brand-chart-purple': `color-mix(in oklab, ${colors.primary} 25%, #8B5CF6)`,
    '--brand-chart-danger': '#EF4444',
    '--brand-chart-muted': '#94A3B8',
    '--brand-chart-track': `color-mix(in oklab, ${colors.surfaceLight} 70%, ${colors.primaryDark})`,
  };
}

function resolveLogoUrl(url: string | undefined, fallback: string, apiBaseUrl?: string): string {
  if (!url) return fallback;
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/images/')) {
    return url;
  }
  if (url.startsWith('/api/') && apiBaseUrl) {
    const origin = apiBaseUrl.replace(/\/api\/?$/, '');
    return `${origin}${url}`;
  }
  return url;
}

export function mergeBrandFromPublic(
  brand: PublicTenantBrand,
  apiBaseUrl?: string,
): BrandConfig {
  const isPlatform = brand.slug === 'platform';
  const fallbackLogos = isPlatform
    ? DEFAULT_BRAND.logos
    : { light: '', dark: '', favicon: '' };
  return {
    name: brand.name || DEFAULT_BRAND.name,
    logos: {
      light: resolveLogoUrl(brand.logos.light, fallbackLogos.light, apiBaseUrl),
      dark: resolveLogoUrl(brand.logos.dark, fallbackLogos.dark, apiBaseUrl),
      favicon: resolveLogoUrl(
        brand.logos.favicon,
        fallbackLogos.favicon,
        apiBaseUrl,
      ),
    },
    colors: resolveBrandColors(brand.colors),
  };
}

export type { BrandColors, BrandLogos };
