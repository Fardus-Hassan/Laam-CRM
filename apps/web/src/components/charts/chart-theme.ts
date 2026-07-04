/** Shared chart palette — maps to Laam brand; swap via theme/API later. */
export const CHART_COLORS = {
  primary: '#127A3B',
  secondary: '#8CC63F',
  tertiary: '#0B4D2A',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  amber: '#F59E0B',
  red: '#EF4444',
  slate: '#94A3B8',
} as const;

export const CHART_SERIES_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.blue,
  CHART_COLORS.secondary,
  CHART_COLORS.purple,
  CHART_COLORS.amber,
  CHART_COLORS.red,
] as const;

export function getSeriesColor(index: number, override?: string): string {
  if (override) return override;
  return CHART_SERIES_PALETTE[index % CHART_SERIES_PALETTE.length];
}
