'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { DonutSegment } from '@laam/types';

import { cn } from '@/lib/utils';
import { getSeriesColor } from '@/components/charts/chart-theme';
import { ChartTooltipContent } from '@/components/charts/chart-tooltip';

type DonutChartProps = {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
  height?: number;
  className?: string;
  showLegend?: boolean;
  legendPosition?: 'bottom' | 'right' | 'responsive';
  showTooltip?: boolean;
};

function DonutLegend({
  segments,
  className,
  compact = false,
}: {
  segments: DonutSegment[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <ul
      className={cn(
        'flex flex-col gap-2',
        compact ? 'gap-1.5' : 'gap-2',
        className,
      )}
    >
      {segments.map((segment, index) => (
        <li
          key={segment.id}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 text-xs"
        >
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: getSeriesColor(index, segment.color) }}
          />
          <span className="truncate text-muted-foreground">{segment.label}</span>
          <span className="shrink-0 font-medium text-foreground">
            {segment.percent}%
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  height = 220,
  className,
  showLegend = true,
  legendPosition = 'bottom',
  showTooltip = true,
}: DonutChartProps) {
  const chartSize = height;
  const forceBottom = legendPosition === 'bottom';
  const forceRight = legendPosition === 'right';
  const useResponsive = legendPosition === 'responsive';

  const chart = (
    <div className="relative mx-auto h-full w-full max-w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={segments}
            dataKey="value"
            nameKey="label"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {segments.map((segment, index) => (
              <Cell
                key={segment.id}
                fill={getSeriesColor(index, segment.color)}
              />
            ))}
          </Pie>
          {showTooltip ? (
            <Tooltip
              content={
                <ChartTooltipContent
                  valueFormatter={(value, name) => {
                    const segment = segments.find((item) => item.label === name);
                    return segment
                      ? `${value.toLocaleString('en-BD')} (${segment.percent}%)`
                      : String(value);
                  }}
                />
              }
            />
          ) : null}
        </PieChart>
      </ResponsiveContainer>
      {centerValue ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none text-foreground sm:text-xl md:text-2xl">
            {centerValue}
          </span>
          {centerLabel ? (
            <span className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
              {centerLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (forceRight && showLegend) {
    return (
      <div
        className={cn(
          '@container flex w-full min-w-0 items-center gap-3 sm:gap-4',
          className,
        )}
      >
        <div
          className="mx-auto shrink-0 @min-[26rem]:mx-0"
          style={{ width: chartSize, height: chartSize }}
        >
          {chart}
        </div>
        <DonutLegend segments={segments} className="min-w-0 flex-1" />
      </div>
    );
  }

  if (useResponsive && showLegend) {
    return (
      <div className={cn('@container w-full min-w-0', className)}>
        <div className="flex flex-col gap-3 @min-[26rem]:flex-row @min-[26rem]:items-center @min-[26rem]:gap-4">
          <div
            className="mx-auto w-full max-w-[200px] shrink-0 @min-[26rem]:mx-0 @min-[26rem]:max-w-none"
            style={{ height: chartSize, width: chartSize }}
          >
            {chart}
          </div>
          <DonutLegend
            segments={segments}
            className="min-w-0 flex-1 grid grid-cols-2 gap-x-3 gap-y-2 @min-[26rem]:flex @min-[26rem]:flex-col"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-3 sm:gap-4', className)}>
      <div
        className="relative mx-auto w-full max-w-[200px] sm:max-w-none"
        style={{ height: chartSize }}
      >
        {chart}
      </div>
      {showLegend && (forceBottom || !forceRight) ? (
        <DonutLegend
          segments={segments}
          className="grid gap-2 sm:grid-cols-2"
        />
      ) : null}
    </div>
  );
}
