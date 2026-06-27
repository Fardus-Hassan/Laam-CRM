export type BrandColors = {
  primary: string;
  primaryDark: string;
  accent: string;
  /** Sidebar palette — same in light and dark mode until API sends per-theme overrides. */
  sidebarBg: string;
  sidebarActiveBg: string;
  sidebarActiveFg: string;
  sidebarFg: string;
  surfaceLight: string;
  surfaceDark: string;
};

export type BrandConfig = {
  name: string;
  logos: {
    default: string;
  };
  colors: BrandColors;
};

export const DEFAULT_BRAND: BrandConfig = {
  name: 'Laam',
  logos: {
    default: '/images/brand/logo.png',
  },
  colors: {
    primary: '#127A3B',
    primaryDark: '#0B4D2A',
    accent: '#FFD700',
    sidebarBg: '#0B4D2A',
    sidebarActiveBg: '#8CC63F',
    sidebarActiveFg: '#FFFFFF',
    sidebarFg: '#F6F9F6',
    surfaceLight: '#F6F9F6',
    surfaceDark: '#1E1E1E',
  },
};

export function brandColorsToCssVars(colors: BrandColors): Record<string, string> {
  return {
    '--brand-primary': colors.primary,
    '--brand-primary-dark': colors.primaryDark,
    '--brand-accent': colors.accent,
    '--brand-sidebar-bg': colors.sidebarBg,
    '--brand-sidebar-active-bg': colors.sidebarActiveBg,
    '--brand-sidebar-active-fg': colors.sidebarActiveFg,
    '--brand-sidebar-fg': colors.sidebarFg,
    '--brand-surface-light': colors.surfaceLight,
    '--brand-surface-dark': colors.surfaceDark,
  };
}
