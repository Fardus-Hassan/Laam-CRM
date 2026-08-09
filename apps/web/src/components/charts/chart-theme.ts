/**
 * Chart palette — always reads live brand CSS variables.
 * SVG stroke/fill and inline backgroundColor both accept `var(--…)`.
 */

export const CHART_COLORS = {
  primary: 'var(--brand-primary, #127A3B)',
  secondary: 'var(--brand-sidebar-active-bg, #8CC63F)',
  tertiary: 'var(--brand-primary-dark, #0B4D2A)',
  accent: 'var(--brand-accent, #FFD700)',
  blue: 'var(--brand-chart-blue, #3B82F6)',
  purple: 'var(--brand-chart-purple, #8B5CF6)',
  amber: 'var(--brand-accent, #FFD700)',
  red: 'var(--brand-chart-danger, #EF4444)',
  slate: 'var(--brand-chart-muted, #94A3B8)',
  track: 'var(--brand-chart-track, #E2E8F0)',
} as const;

/** Hexes used in older mocks / screens — remap to brand tokens. */
const LEGACY_BRAND_HEX: Record<string, string> = {
  '#127a3b': CHART_COLORS.primary,
  '#8cc63f': CHART_COLORS.secondary,
  '#0b4d2a': CHART_COLORS.tertiary,
  '#22c55e': CHART_COLORS.secondary,
  '#16a34a': CHART_COLORS.primary,
  '#adff2f': CHART_COLORS.secondary,
  '#ffd700': CHART_COLORS.accent,
  '#f59e0b': CHART_COLORS.accent,
  '#fbbf24': CHART_COLORS.accent,
};

export function resolveChartColor(color?: string | null): string | undefined {
  if (!color) return undefined;
  if (color.startsWith('var(')) return color;
  const mapped = LEGACY_BRAND_HEX[color.trim().toLowerCase()];
  return mapped ?? color;
}

export const CHART_SERIES_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.blue,
  CHART_COLORS.secondary,
  CHART_COLORS.purple,
  CHART_COLORS.accent,
  CHART_COLORS.red,
] as const;

export function getSeriesColor(index: number, override?: string): string {
  const resolved = resolveChartColor(override);
  if (resolved) return resolved;
  return CHART_SERIES_PALETTE[index % CHART_SERIES_PALETTE.length];
}
