'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { TargetSummary } from '@laam/types';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useChartTheme } from '@/components/charts/use-chart-theme';

const SPENT_COLOR = '#22C55E';
const REMAINING_COLOR = '#8B5CF6';

type BudgetOverviewChartProps = {
  summary: TargetSummary;
  className?: string;
};

export function BudgetOverviewChart({ summary, className }: BudgetOverviewChartProps) {
  const theme = useChartTheme();
  const segments = [
    { id: 'spent', value: summary.achieved, color: SPENT_COLOR },
    { id: 'remaining', value: summary.remaining, color: theme.donutTrack },
  ];

  return (
    <div
      className={cn(
        '@container flex flex-col items-center gap-5 @min-[18rem]:flex-row @min-[18rem]:items-center @min-[18rem]:gap-4',
        className,
      )}
    >
      <div className="relative mx-auto size-[148px] shrink-0 sm:size-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              innerRadius="68%"
              outerRadius="92%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {segments.map((segment) => (
                <Cell key={segment.id} fill={segment.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-lg font-bold leading-tight text-foreground sm:text-xl">
            {formatCurrency(summary.target)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
            Total Budget
          </p>
        </div>
      </div>

      <div className="w-full min-w-0 flex-1 space-y-3.5">
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: SPENT_COLOR }}
            />
            <span className="text-muted-foreground">Spent</span>
          </div>
          <p className="pl-[1.125rem] font-semibold leading-snug text-foreground">
            {formatCurrency(summary.achieved)} ({summary.achievementPercent.toFixed(2)}%)
          </p>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: REMAINING_COLOR }}
            />
            <span className="text-muted-foreground">Remaining</span>
          </div>
          <p className="pl-[1.125rem] font-semibold leading-snug text-foreground">
            {formatCurrency(summary.remaining)} (
            {(100 - summary.achievementPercent).toFixed(2)}%)
          </p>
        </div>

        <Separator className="bg-border/70" />

        <div className="space-y-2">
          <div className="space-y-1 text-sm">
            <span className="text-muted-foreground">Utilization Rate</span>
            <p className="font-semibold text-foreground">
              {summary.achievementPercent.toFixed(2)}%
            </p>
          </div>
          <Progress
            value={summary.achievementPercent}
            className="h-2.5 bg-muted"
            indicatorClassName="bg-[#8B5CF6]"
          />
        </div>
      </div>
    </div>
  );
}
