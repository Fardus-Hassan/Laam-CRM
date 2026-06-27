'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import { cn } from '@/lib/utils';
import { CHART_COLORS } from '@/components/charts/chart-theme';
import { useChartTheme } from '@/components/charts/use-chart-theme';

type PerformanceGaugeChartProps = {
  percent: number;
  label?: string;
  className?: string;
  size?: number;
  color?: string;
};

export function PerformanceGaugeChart({
  percent,
  label = 'Overall Performance',
  className,
  size = 160,
  color = CHART_COLORS.secondary,
}: PerformanceGaugeChartProps) {
  const theme = useChartTheme();
  const clamped = Math.min(100, Math.max(0, percent));
  const segments = [
    { id: 'achieved', value: clamped, color },
    { id: 'remaining', value: 100 - clamped, color: theme.donutTrack },
  ];

  return (
    <div
      className={cn('relative mx-auto aspect-square w-full max-w-full', className)}
      style={{ width: size, height: size }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={segments}
            dataKey="value"
            innerRadius="68%"
            outerRadius="92%"
            paddingAngle={2}
            strokeWidth={0}
            cx="50%"
            cy="50%"
          >
            {segments.map((segment) => (
              <Cell key={segment.id} fill={segment.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-center text-center">
        <p className="text-xl font-bold leading-none text-foreground sm:text-2xl">
          {clamped.toFixed(1)}%
        </p>
        <p className="mt-1 max-w-[5.5rem] text-[10px] leading-tight text-muted-foreground sm:max-w-none sm:text-xs">
          {label}
        </p>
      </div>
    </div>
  );
}
