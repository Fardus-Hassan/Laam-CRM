import { differenceInCalendarDays, format, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export function getDefaultDateRange(): DateRange {
  const to = new Date();
  const from = subDays(to, 6);
  return { from, to };
}

export function formatDateRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) {
    return 'Select date range';
  }

  const pattern = 'd MMM yyyy';

  if (!range.to) {
    return format(range.from, pattern);
  }

  return `${format(range.from, pattern)} - ${format(range.to, pattern)}`;
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

export function getRangeDayCount(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from) + 1;
}
