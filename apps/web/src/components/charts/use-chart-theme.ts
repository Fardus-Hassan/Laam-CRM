'use client';

import { useTheme } from 'next-themes';

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return {
    isDark,
    tick: isDark ? '#c5cdc5' : '#5a6b5c',
    grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    cursor: isDark
      ? 'rgba(255, 255, 255, 0.06)'
      : 'color-mix(in oklab, var(--brand-primary, #127A3B) 12%, transparent)',
    donutTrack: isDark
      ? 'color-mix(in oklab, var(--brand-surface-dark, #1E1E1E) 70%, white)'
      : 'color-mix(in oklab, var(--brand-surface-light, #F6F9F6) 75%, var(--brand-primary-dark, #0B4D2A))',
  };
}
