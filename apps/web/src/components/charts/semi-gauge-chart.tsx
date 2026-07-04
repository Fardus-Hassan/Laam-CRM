'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { TargetSummary } from '@laam/types';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { CHART_COLORS } from '@/components/charts/chart-theme';
import { useChartTheme } from '@/components/charts/use-chart-theme';

type SemiGaugeChartProps = {
  summary: TargetSummary;
  className?: string;
  height?: number;
};

export function SemiGaugeChart({
  summary,
  className,
  height = 160,
}: SemiGaugeChartProps) {
  const theme = useChartTheme();
  const segments = [
    {
      id: 'spent',
      value: summary.achieved,
      color: CHART_COLORS.primary,
    },
    {
      id: 'remaining',
      value: summary.remaining,
      color: theme.donutTrack,
    },
  ];

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="relative w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              startAngle={180}
              endAngle={0}
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2}
              strokeWidth={0}
              cx="50%"
              cy="100%"
            >
              {segments.map((segment) => (
                <Cell key={segment.id} fill={segment.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center">
          <p className="text-xl font-bold text-foreground sm:text-2xl">
            {formatCurrency(summary.target, { compact: true })}
          </p>
          <p className="text-xs text-muted-foreground">Total Budget</p>
        </div>
      </div>

      <dl className="grid w-full grid-cols-3 gap-2 text-center text-xs sm:text-sm">
        <div>
          <dt className="text-muted-foreground">Spent</dt>
          <dd className="mt-0.5 font-semibold text-primary">
            {formatCurrency(summary.achieved, { compact: true })}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Used</dt>
          <dd className="mt-0.5 font-semibold">{summary.achievementPercent}%</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Remaining</dt>
          <dd className="mt-0.5 font-semibold">
            {formatCurrency(summary.remaining, { compact: true })}
          </dd>
        </div>
      </dl>
    </div>
  );
}
