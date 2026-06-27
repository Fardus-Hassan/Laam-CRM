'use client';

import { CalendarRange, Check, ChevronDown } from 'lucide-react';

import type { DashboardPeriod } from '@/features/dashboard/types/period';
import { DASHBOARD_PERIODS, PERIOD_LABELS } from '@/features/dashboard/types/period';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-8 shrink-0 gap-1.5 border-border/70 bg-card px-2.5 text-xs font-medium text-foreground shadow-xs sm:px-3 sm:text-sm',
            className,
          )}
          aria-label="Select period"
        >
          <CalendarRange className="size-3.5 shrink-0 opacity-70" />
          <span>{PERIOD_LABELS[value]}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {options.map((period) => (
          <DropdownMenuItem
            key={period}
            className="gap-2 text-sm"
            onClick={() => onChange(period)}
          >
            <Check
              className={cn(
                'size-4 shrink-0',
                value === period ? 'opacity-100' : 'opacity-0',
              )}
            />
            {PERIOD_LABELS[period]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
