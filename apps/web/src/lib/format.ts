const BDT = '৳';

/** Always 12-hour clock with AM/PM across the CRM UI. */
const DATETIME_LOCALE = 'en-GB';

function toValidDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Time only — e.g. `3:45 PM` */
export function formatTime(value: Date | string | number): string {
  const date = toValidDate(value);
  if (!date) return '—';
  return date.toLocaleTimeString(DATETIME_LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Date + time — e.g. `09 Aug 2026, 3:45 PM` */
export function formatDateTime(value: Date | string | number): string {
  const date = toValidDate(value);
  if (!date) return '—';
  return date.toLocaleString(DATETIME_LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Date only — e.g. `09 Aug 2026` */
export function formatDate(value: Date | string | number): string {
  const date = toValidDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(DATETIME_LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

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
