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
import type { ChannelPerformancePoint } from '@laam/types';

import { cn } from '@/lib/utils';
import { formatCompactNumber } from '@/lib/format';
import { CHART_COLORS } from '@/components/charts/chart-theme';
import { ChartTooltipContent } from '@/components/charts/chart-tooltip';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { useIsMobile } from '@/hooks/use-mobile';

type ComboBarLineChartProps = {
  data: ChannelPerformancePoint[];
  barKey?: keyof ChannelPerformancePoint;
  lineKey?: keyof ChannelPerformancePoint;
  barLabel?: string;
  lineLabel?: string;
  className?: string;
};

export function ComboBarLineChart({
  data,
  barKey = 'leads',
  lineKey = 'conversionRate',
  barLabel = 'Leads',
  lineLabel = 'Conversion Rate',
  className,
}: ComboBarLineChartProps) {
  const theme = useChartTheme();
  const isMobile = useIsMobile();
  const tickSize = isMobile ? 10 : 11;

  return (
    <div className={cn('w-full min-w-0', className)}>
      <div className="h-[220px] w-full sm:h-[260px]">
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
              width={isMobile ? 36 : 44}
              tick={{ fontSize: tickSize, fill: theme.tick }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatCompactNumber(Number(value))}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              width={isMobile ? 36 : 44}
              tick={{ fontSize: tickSize, fill: theme.tick }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              cursor={{ fill: theme.cursor }}
              content={
                <ChartTooltipContent
                  valueFormatter={(value, name) => {
                    if (name === lineLabel) {
                      return `${value}%`;
                    }
                    return formatCompactNumber(value);
                  }}
                />
              }
            />
            <Bar
              yAxisId="left"
              dataKey={barKey}
              name={barLabel}
              fill={CHART_COLORS.primary}
              radius={[4, 4, 0, 0]}
              maxBarSize={isMobile ? 24 : 36}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={lineKey}
              name={lineLabel}
              stroke={CHART_COLORS.secondary}
              strokeWidth={isMobile ? 1.5 : 2}
              dot={{ r: isMobile ? 2 : 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

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
    </div>
  );
}
