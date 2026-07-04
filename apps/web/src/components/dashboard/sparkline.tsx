'use client';

import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import type { ChartPoint } from '@laam/types';

import { cn } from '@/lib/utils';
import { CHART_COLORS } from '@/components/charts/chart-theme';

type SparklineProps = {
  data: ChartPoint[];
  className?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
};

export function Sparkline({
  data,
  className,
  color,
  trend = 'neutral',
}: SparklineProps) {
  const stroke =
    color ??
    (trend === 'up'
      ? CHART_COLORS.secondary
      : trend === 'down'
        ? '#EF4444'
        : CHART_COLORS.primary);

  if (!data.length) {
    return null;
  }

  return (
    <div className={cn('h-9 w-full min-w-[4.5rem]', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
          <YAxis hide domain={['dataMin - 4', 'dataMax + 4']} />
          <Line
            type="linear"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
