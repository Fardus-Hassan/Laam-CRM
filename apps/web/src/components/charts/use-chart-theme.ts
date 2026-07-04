'use client';

import { useTheme } from 'next-themes';

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return {
    isDark,
    tick: isDark ? '#c5cdc5' : '#5a6b5c',
    grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    cursor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(18, 122, 59, 0.08)',
    donutTrack: isDark ? '#3a3a3a' : '#e5e7eb',
  };
}
