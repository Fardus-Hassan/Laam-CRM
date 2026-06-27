'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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

type DualAxisComboChartProps = {
  data: DualAxisPoint[];
  barLabel: string;
  lineLabel: string;
  barFormatter?: (value: number) => string;
  lineFormatter?: (value: number) => string;
  className?: string;
  heightClassName?: string;
  showLegend?: boolean;
};

export function DualAxisComboChart({
  data,
  barLabel,
  lineLabel,
  barFormatter = (value) => formatCompactNumber(value),
  lineFormatter = (value) => formatCompactNumber(value),
  className,
  heightClassName = 'h-[220px] w-full sm:h-[240px]',
  showLegend = true,
}: DualAxisComboChartProps) {
  const theme = useChartTheme();
  const isMobile = useIsMobile();
  const tickSize = isMobile ? 10 : 11;

  return (
    <div className={cn('w-full min-w-0', className)}>
      <div className={cn(heightClassName)}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
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
              cursor={{ fill: theme.cursor }}
              wrapperStyle={{ zIndex: 50, outline: 'none' }}
              content={
                <ChartTooltipContent
                  valueFormatter={(value, name) => {
                    if (name === lineLabel) {
                      return lineFormatter(value);
                    }
                    return barFormatter(value);
                  }}
                />
              }
            />
            <Bar
              yAxisId="left"
              dataKey="bar"
              name={barLabel}
              fill={CHART_COLORS.primary}
              radius={[4, 4, 0, 0]}
              maxBarSize={isMobile ? 22 : 32}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="line"
              name={lineLabel}
              stroke={CHART_COLORS.secondary}
              strokeWidth={isMobile ? 1.5 : 2}
              dot={{ r: isMobile ? 2 : 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {showLegend ? (
        <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-xs">
          <li className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: CHART_COLORS.primary }}
            />
            <span className="text-muted-foreground">{barLabel}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: CHART_COLORS.secondary }}
            />
            <span className="text-muted-foreground">{lineLabel}</span>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
