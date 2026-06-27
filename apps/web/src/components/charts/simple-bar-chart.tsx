'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartPoint } from '@laam/types';

import { cn } from '@/lib/utils';
import { formatCompactNumber, formatCurrency } from '@/lib/format';
import { CHART_COLORS } from '@/components/charts/chart-theme';
import { ChartTooltipContent } from '@/components/charts/chart-tooltip';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { useIsMobile } from '@/hooks/use-mobile';

type SimpleBarChartProps = {
  data: ChartPoint[];
  color?: string;
  valueFormatter?: (value: number) => string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const SIZE_CLASS = {
  sm: 'h-[120px] sm:h-[140px]',
  md: 'h-[180px] sm:h-[220px]',
  lg: 'h-[200px] sm:h-[260px]',
} as const;

export function SimpleBarChart({
  data,
  color = CHART_COLORS.primary,
  valueFormatter,
  className,
  size = 'md',
}: SimpleBarChartProps) {
  const theme = useChartTheme();
  const isMobile = useIsMobile();
  const tickSize = isMobile ? 10 : 11;

  return (
    <div className={cn('w-full min-w-0', SIZE_CLASS[size], className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 8,
            right: isMobile ? 4 : 8,
            left: isMobile ? -8 : 0,
            bottom: 0,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.grid}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: tickSize, fill: theme.tick }}
            axisLine={false}
            tickLine={false}
            interval={isMobile ? 'preserveStartEnd' : 0}
          />
          <YAxis
            width={isMobile ? 40 : 48}
            tick={{ fontSize: tickSize, fill: theme.tick }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatCompactNumber(Number(value))}
          />
          <Tooltip
            cursor={{ fill: theme.cursor }}
            content={
              <ChartTooltipContent
                valueFormatter={(value) =>
                  valueFormatter
                    ? valueFormatter(value)
                    : formatCurrency(value, { compact: true })
                }
              />
            }
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={isMobile ? 28 : 40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
