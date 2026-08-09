import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import type { DateRange } from 'react-day-picker';

export type DateRangePresetId =
  | 'today'
  | 'yesterday'
  | 'last_7'
  | 'last_30'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'all_time'
  | 'custom';

export type DateRangePresetOption = {
  id: DateRangePresetId;
  label: string;
};

/** Bizmation-style presets (Max = All Time). */
export const DATE_RANGE_PRESETS: DateRangePresetOption[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7', label: 'Last 7 Days' },
  { id: 'last_30', label: 'Last 30 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'last_year', label: 'Last Year' },
  { id: 'all_time', label: 'Max' },
  { id: 'custom', label: 'Custom Range' },
];

export function getDefaultDateRange(): DateRange {
  const to = endOfDay(new Date());
  const from = startOfDay(subDays(to, 6));
  return { from, to };
}

export function resolvePresetToRange(
  preset: DateRangePresetId,
  now = new Date(),
): DateRange | undefined {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (preset) {
    case 'today':
      return { from: todayStart, to: todayEnd };
    case 'yesterday': {
      const y = subDays(todayStart, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case 'last_7':
      return { from: startOfDay(subDays(todayStart, 6)), to: todayEnd };
    case 'last_30':
      return { from: startOfDay(subDays(todayStart, 29)), to: todayEnd };
    case 'this_month':
      return { from: startOfMonth(now), to: todayEnd };
    case 'last_month': {
      const last = subMonths(now, 1);
      return { from: startOfMonth(last), to: endOfMonth(last) };
    }
    case 'this_year':
      return { from: startOfYear(now), to: todayEnd };
    case 'last_year': {
      const last = subYears(now, 1);
      return { from: startOfYear(last), to: endOfYear(last) };
    }
    case 'all_time':
      return undefined;
    case 'custom':
      return undefined;
    default:
      return undefined;
  }
}

export function detectDateRangePreset(
  range: DateRange | undefined,
  now = new Date(),
): DateRangePresetId {
  if (!range?.from || !range.to) return 'all_time';

  for (const preset of DATE_RANGE_PRESETS) {
    if (preset.id === 'custom' || preset.id === 'all_time') continue;
    const resolved = resolvePresetToRange(preset.id, now);
    if (
      resolved?.from &&
      resolved.to &&
      isSameDay(range.from, resolved.from) &&
      isSameDay(range.to, resolved.to)
    ) {
      return preset.id;
    }
  }
  return 'custom';
}

export function formatDateRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) {
    return 'All Time';
  }

  const pattern = 'dd/MM/yyyy';

  if (!range.to) {
    return format(range.from, pattern);
  }

  return `${format(range.from, pattern)} - ${format(range.to, pattern)}`;
}

export function formatDateRangeLabelLong(range: DateRange | undefined): string {
  if (!range?.from || !range.to) {
    return 'All Time';
  }
  return `${format(range.from, 'dd/MM/yyyy h:mm:ss a')} - ${format(range.to, 'dd/MM/yyyy h:mm:ss a')}`;
}

export function toISODateRange(range: DateRange | undefined): {
  from: string;
  to: string;
} | null {
  if (!range?.from || !range.to) {
    return null;
  }

  return {
    from: format(range.from, 'yyyy-MM-dd'),
    to: format(range.to, 'yyyy-MM-dd'),
  };
}

export function rangeFromISO(from?: string, to?: string): DateRange | undefined {
  if (!from && !to) return undefined;
  const start = from ? startOfDay(new Date(from)) : undefined;
  const end = to ? endOfDay(new Date(to)) : start ? endOfDay(start) : undefined;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return undefined;
  }
  return { from: start, to: end };
}

export function getRangeDayCount(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from) + 1;
}

/** Map UI preset → API orderListQuery.dateRange (+ optional ISO dates). */
export function presetToOrderQuery(preset: DateRangePresetId, range?: DateRange): {
  dateRange: DateRangePresetId;
  dateFrom?: string;
  dateTo?: string;
} {
  if (preset === 'all_time') {
    return { dateRange: 'all_time' };
  }
  if (preset === 'custom') {
    const iso = toISODateRange(range);
    return {
      dateRange: 'custom',
      dateFrom: iso?.from,
      dateTo: iso?.to,
    };
  }
  // Prefer explicit ISO for server so clock skew / timezone is stable
  const resolved = range ?? resolvePresetToRange(preset);
  const iso = toISODateRange(resolved);
  return {
    dateRange: preset,
    dateFrom: iso?.from,
    dateTo: iso?.to,
  };
}
