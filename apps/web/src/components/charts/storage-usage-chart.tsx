'use client';

import type { StorageUsage } from '@laam/types';

import { cn } from '@/lib/utils';
import { CHART_COLORS } from '@/components/charts/chart-theme';
import { DonutChart } from '@/components/charts/donut-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';

type StorageUsageChartProps = {
  usage: StorageUsage;
  className?: string;
};

const STAT_ITEMS = [
  { id: 'used', label: 'Used', key: 'usedGb' as const, showDot: true },
  { id: 'total', label: 'Total', key: 'totalGb' as const, showDot: false },
  { id: 'available', label: 'Available', key: 'availableGb' as const, showDot: false },
];

export function StorageUsageChart({ usage, className }: StorageUsageChartProps) {
  const theme = useChartTheme();
  const clamped = Math.min(100, Math.max(0, usage.usedPercent));

  const segments = [
    {
      id: 'used',
      label: 'Used',
      value: usage.usedGb,
      percent: clamped,
      color: CHART_COLORS.primary,
    },
    {
      id: 'available',
      label: 'Available',
      value: usage.availableGb,
      percent: 100 - clamped,
      color: theme.donutTrack,
    },
  ];

  return (
    <div className={cn('flex w-full min-w-0 flex-col items-center gap-4', className)}>
      <DonutChart
        segments={segments}
        centerValue={`${clamped}%`}
        centerLabel={['Used']}
        height={160}
        innerRadius="68%"
        showLegend={false}
        showTooltip={false}
        className="mx-auto w-full max-w-[168px]"
      />

      <ul className="grid w-full grid-cols-3 gap-2 border-t border-border/70 pt-4 text-center sm:gap-3">
        {STAT_ITEMS.map((item) => (
          <li key={item.id} className="min-w-0 space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              {item.showDot ? (
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: CHART_COLORS.primary }}
                  aria-hidden
                />
              ) : null}
              <span className="truncate text-xs text-muted-foreground sm:text-sm">
                {item.label}
              </span>
            </div>
            <p className="truncate text-sm font-semibold text-foreground sm:text-base">
              {usage[item.key]} GB
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
