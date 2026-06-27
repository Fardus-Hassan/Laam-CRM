'use client';

import * as React from 'react';
import type { FunnelStage } from '@laam/types';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const FUNNEL_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#F97316'] as const;

const ROW_HEIGHT = 52;
const FUNNEL_WIDTH = 100;
const WIDTH_STEP = 10;

type FunnelChartProps = {
  stages: FunnelStage[];
  className?: string;
};

function formatStageValue(stage: FunnelStage, index: number) {
  if (index === 0) {
    return stage.value.toLocaleString('en-BD');
  }

  return `${stage.value.toLocaleString('en-BD')} (${stage.percent}%)`;
}

function getSegmentGeometry(index: number) {
  const inset = index * WIDTH_STEP;
  const topWidth = FUNNEL_WIDTH - inset * 2;
  const bottomWidth = FUNNEL_WIDTH - (index + 1) * WIDTH_STEP * 2;
  const bottomInset = inset + (topWidth - bottomWidth) / 2;
  const y = index * ROW_HEIGHT;

  return {
    y,
    points: [
      `${inset},${y}`,
      `${inset + topWidth},${y}`,
      `${bottomInset + bottomWidth},${y + ROW_HEIGHT}`,
      `${bottomInset},${y + ROW_HEIGHT}`,
    ].join(' '),
  };
}

function FunnelGraphic({
  stages,
  hoveredIndex,
  onHover,
}: {
  stages: FunnelStage[];
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}) {
  const svgHeight = stages.length * ROW_HEIGHT;

  return (
    <svg
      viewBox={`0 0 ${FUNNEL_WIDTH} ${svgHeight}`}
      className="h-full w-full max-h-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {stages.map((stage, index) => {
        const { points } = getSegmentGeometry(index);
        const isDimmed = hoveredIndex !== null && hoveredIndex !== index;
        const isActive = hoveredIndex === index;

        return (
          <polygon
            key={stage.id}
            points={points}
            fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]}
            className={cn(
              'cursor-pointer transition-[opacity,filter] duration-150',
              isDimmed && 'opacity-35',
              isActive && 'brightness-110',
            )}
            onMouseEnter={() => onHover(index)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(index)}
            onBlur={() => onHover(null)}
          />
        );
      })}
    </svg>
  );
}

type FunnelRowProps = {
  stage: FunnelStage;
  index: number;
  color: string;
  isActive: boolean;
  isDimmed: boolean;
  onHover: (index: number | null) => void;
};

function FunnelRow({
  stage,
  index,
  color,
  isActive,
  isDimmed,
  onHover,
}: FunnelRowProps) {
  const value = formatStageValue(stage, index);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'grid h-[var(--funnel-row-height)] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 rounded-md px-1.5 transition-colors duration-150 sm:gap-x-3 sm:px-2',
            index > 0 && 'border-t border-border/70',
            isActive && 'bg-muted/60',
            isDimmed && 'opacity-50',
          )}
          onMouseEnter={() => onHover(index)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(index)}
          onBlur={() => onHover(null)}
          tabIndex={0}
          role="button"
          aria-label={`${stage.label}: ${value}`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full @[16rem]:hidden"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span
              className="truncate text-[11px] leading-none text-muted-foreground sm:text-xs"
              title={stage.label}
            >
              {stage.label}
            </span>
          </span>
          <span className="shrink-0 text-[11px] font-semibold leading-none text-foreground sm:text-xs">
            {value}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[14rem]">
        <p className="font-medium">{stage.label}</p>
        <p className="mt-0.5 text-background/80">{value}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function FunnelChart({ stages, className }: FunnelChartProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const rowTemplate = `repeat(${stages.length}, var(--funnel-row-height))`;

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className={cn('@container w-full min-w-0', className)}
        style={
          {
            '--funnel-row-height': `${ROW_HEIGHT}px`,
          } as React.CSSProperties
        }
        role="img"
        aria-label="Leads funnel chart"
      >
        <div
          className="grid w-full min-w-0 items-stretch gap-x-2 sm:gap-x-3"
          style={{
            gridTemplateColumns: 'minmax(4.75rem, 38%) minmax(0, 1fr)',
            gridTemplateRows: rowTemplate,
          }}
        >
          <div
            className="col-start-1 row-start-1 flex h-full items-stretch justify-center self-stretch"
            style={{ gridRowEnd: stages.length + 1 }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="h-full w-full max-w-[9.5rem]">
              <FunnelGraphic
                stages={stages}
                hoveredIndex={hoveredIndex}
                onHover={setHoveredIndex}
              />
            </div>
          </div>

          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className="col-start-2 min-w-0"
              style={{ gridRow: index + 1 }}
            >
              <FunnelRow
                stage={stage}
                index={index}
                color={FUNNEL_COLORS[index % FUNNEL_COLORS.length]}
                isActive={hoveredIndex === index}
                isDimmed={hoveredIndex !== null && hoveredIndex !== index}
                onHover={setHoveredIndex}
              />
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
