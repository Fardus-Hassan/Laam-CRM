'use client';

import * as React from 'react';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartSeries } from '@laam/types';

import { cn } from '@/lib/utils';
import { formatCompactNumber } from '@/lib/format';
import { ChartTooltipContent } from '@/components/charts/chart-tooltip';
import { getSeriesColor } from '@/components/charts/chart-theme';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { useIsMobile } from '@/hooks/use-mobile';

type MultiLineChartProps = {
  series: ChartSeries[];
  className?: string;
};

function buildChartData(series: ChartSeries[]) {
  const labels = series[0]?.data.map((point) => point.label) ?? [];

  return labels.map((label, index) => {
    const row: Record<string, string | number> = { label };

    for (const item of series) {
      row[item.id] = item.data[index]?.value ?? 0;
    }

    return row;
  });
}

export function MultiLineChart({ series, className }: MultiLineChartProps) {
  const data = buildChartData(series);
  const theme = useChartTheme();
  const isMobile = useIsMobile();
  const tickSize = isMobile ? 10 : 11;

  const formatValue = (value: number, seriesId: string) => {
    const seriesItem = series.find((item) => item.id === seriesId);
    const numeric = Number(value);

    if (seriesItem?.label.includes('Revenue') || numeric >= 10000) {
      return `৳ ${formatCompactNumber(numeric)}`;
    }

    return formatCompactNumber(numeric);
  };

  return (
    <div className={cn('w-full min-w-0', className)}>
      <div className="h-[220px] w-full sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 8,
              right: isMobile ? 4 : 8,
              left: isMobile ? -8 : 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: tickSize, fill: theme.tick }}
              axisLine={false}
              tickLine={false}
              interval={isMobile ? 'preserveStartEnd' : 0}
            />
            <YAxis
              width={isMobile ? 42 : 48}
              tick={{ fontSize: tickSize, fill: theme.tick }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatCompactNumber(Number(value))}
            />
            <Tooltip
              cursor={{ fill: theme.cursor }}
              content={
                <ChartTooltipContent
                  valueFormatter={(value, name) => {
                    const seriesItem = series.find((item) => item.label === name);
                    return formatValue(value, seriesItem?.id ?? name);
                  }}
                />
              }
            />
            {series.map((item, index) => (
              <Line
                key={item.id}
                type="monotone"
                dataKey={item.id}
                name={item.label}
                stroke={getSeriesColor(index, item.color)}
                strokeWidth={isMobile ? 1.5 : 2}
                dot={false}
                activeDot={{ r: isMobile ? 3 : 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-border/70 pt-3 sm:gap-x-4">
        {series.map((item, index) => (
          <li key={item.id} className="flex items-center gap-1.5 text-[11px] sm:gap-2 sm:text-xs">
            <span
              className="size-2 shrink-0 rounded-full sm:size-2.5"
              style={{ backgroundColor: getSeriesColor(index, item.color) }}
            />
            <span className="text-muted-foreground">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
