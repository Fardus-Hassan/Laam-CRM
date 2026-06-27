'use client';

import type { DashboardPeriod } from '@/features/dashboard/types/period';
import { DASHBOARD_PERIODS, PERIOD_LABELS } from '@/features/dashboard/types/period';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type PeriodFilterProps = {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
  options?: readonly DashboardPeriod[];
  className?: string;
};

export function PeriodFilter({
  value,
  onChange,
  options = [...DASHBOARD_PERIODS],
  className,
}: PeriodFilterProps) {
  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center rounded-lg border border-border bg-muted/40 p-0.5',
        className,
      )}
      role="group"
      aria-label="Period filter"
    >
      {options.map((period) => (
        <Button
          key={period}
          type="button"
          variant={value === period ? 'default' : 'ghost'}
          size="xs"
          className={cn(
            'h-7 min-w-[44px] flex-1 px-2 text-[11px] font-medium sm:min-w-[52px] sm:px-2.5 sm:text-xs',
            value !== period && 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onChange(period)}
        >
          {PERIOD_LABELS[period]}
        </Button>
      ))}
    </div>
  );
}
