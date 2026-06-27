'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DualAxisPoint } from '@laam/types';

import { cn } from '@/lib/utils';
import { formatCompactNumber } from '@/lib/format';
import { CHART_COLORS } from '@/components/charts/chart-theme';
import { ChartTooltipContent } from '@/components/charts/chart-tooltip';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { useIsMobile } from '@/hooks/use-mobile';

type DualAxisLineChartProps = {
  data: DualAxisPoint[];
  leftLabel: string;
  rightLabel: string;
  leftFormatter?: (value: number) => string;
  rightFormatter?: (value: number) => string;
  leftColor?: string;
  rightColor?: string;
  className?: string;
  heightClassName?: string;
  showLegend?: boolean;
};

export function DualAxisLineChart({
  data,
  leftLabel,
  rightLabel,
  leftFormatter = (value) => formatCompactNumber(value),
  rightFormatter = (value) => formatCompactNumber(value),
  leftColor = CHART_COLORS.primary,
  rightColor = CHART_COLORS.secondary,
  className,
  heightClassName = 'h-[220px] w-full sm:h-[260px]',
  showLegend = true,
}: DualAxisLineChartProps) {
  const theme = useChartTheme();
  const isMobile = useIsMobile();
  const tickSize = isMobile ? 10 : 11;

  return (
    <div className={cn('w-full min-w-0', className)}>
      <div className={cn(heightClassName)}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 8,
              right: isMobile ? 4 : 12,
              left: isMobile ? -8 : 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: tickSize, fill: theme.tick }}
              axisLine={false}
              tickLine={false}
              interval={isMobile ? 'preserveStartEnd' : 0}
            />
            <YAxis
              yAxisId="left"
              width={isMobile ? 40 : 48}
              tick={{ fontSize: tickSize, fill: theme.tick }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatCompactNumber(Number(value))}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              width={isMobile ? 40 : 48}
              tick={{ fontSize: tickSize, fill: theme.tick }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatCompactNumber(Number(value))}
            />
            <Tooltip
              cursor={{ stroke: theme.cursor, strokeWidth: 1 }}
              wrapperStyle={{ zIndex: 50, outline: 'none' }}
              content={
                <ChartTooltipContent
                  valueFormatter={(value, name) => {
                    if (name === rightLabel) {
                      return rightFormatter(value);
                    }
                    return leftFormatter(value);
                  }}
                />
              }
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="bar"
              name={leftLabel}
              stroke={leftColor}
              strokeWidth={isMobile ? 1.5 : 2}
              dot={{ r: isMobile ? 2 : 3, fill: leftColor }}
              activeDot={{ r: isMobile ? 4 : 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="line"
              name={rightLabel}
              stroke={rightColor}
              strokeWidth={isMobile ? 1.5 : 2}
              dot={{ r: isMobile ? 2 : 3, fill: rightColor }}
              activeDot={{ r: isMobile ? 4 : 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {showLegend ? (
        <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-xs">
          <li className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: leftColor }}
            />
            <span className="text-muted-foreground">{leftLabel}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: rightColor }}
            />
            <span className="text-muted-foreground">{rightLabel}</span>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
