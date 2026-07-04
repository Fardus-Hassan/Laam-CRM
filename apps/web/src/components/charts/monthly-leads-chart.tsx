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
import type { MonthlyLeadsPoint } from '@laam/types';

import { cn } from '@/lib/utils';
import { formatCompactNumber } from '@/lib/format';
import { CHART_COLORS } from '@/components/charts/chart-theme';
import { ChartTooltipContent } from '@/components/charts/chart-tooltip';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { useIsMobile } from '@/hooks/use-mobile';

type MonthlyLeadsChartProps = {
  data: MonthlyLeadsPoint[];
  className?: string;
};

export function MonthlyLeadsChart({ data, className }: MonthlyLeadsChartProps) {
  const theme = useChartTheme();
  const isMobile = useIsMobile();
  const tickSize = isMobile ? 10 : 11;

  return (
    <div className={cn('w-full min-w-0', className)}>
      <div className="h-[200px] w-full sm:h-[240px]">
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
                    if (name === 'Conversion Rate') {
                      return `${value}%`;
                    }
                    return formatCompactNumber(value);
                  }}
                />
              }
            />
            <Bar
              yAxisId="left"
              dataKey="leads"
              name="Leads"
              fill={CHART_COLORS.blue}
              radius={[3, 3, 0, 0]}
              maxBarSize={isMobile ? 14 : 20}
            />
            <Bar
              yAxisId="left"
              dataKey="converted"
              name="Converted"
              fill={CHART_COLORS.primary}
              radius={[3, 3, 0, 0]}
              maxBarSize={isMobile ? 14 : 20}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="conversionRate"
              name="Conversion Rate"
              stroke={CHART_COLORS.amber}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-border/70 pt-3 text-[11px] sm:text-xs">
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#3B82F6]" />
          <span className="text-muted-foreground">Leads</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#127A3B]" />
          <span className="text-muted-foreground">Converted</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#F59E0B]" />
          <span className="text-muted-foreground">Conv. Rate</span>
        </li>
      </ul>
    </div>
  );
}
