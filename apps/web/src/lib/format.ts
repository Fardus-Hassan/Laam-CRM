const BDT = '৳';

export function formatNumber(value: number, locale = 'en-BD'): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatCurrency(
  value: number,
  options?: { compact?: boolean; locale?: string },
): string {
  const locale = options?.locale ?? 'en-BD';

  if (options?.compact && value >= 100_000) {
    const lakhs = value / 100_000;
    return `${BDT} ${lakhs.toFixed(1)}L`;
  }

  return `${BDT} ${formatNumber(value, locale)}`;
}

export function formatPercent(value: number, digits = 1): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(digits)}%`;
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}
