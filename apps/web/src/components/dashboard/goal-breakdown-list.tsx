import type { GoalBreakdown } from '@laam/types';

import { CHART_COLORS } from '@/components/charts/chart-theme';
import { cn } from '@/lib/utils';

type GoalBreakdownListProps = {
  breakdown: GoalBreakdown;
  className?: string;
};

const ITEMS = [
  { key: 'total', label: 'Total Goals', color: CHART_COLORS.slate },
  { key: 'achieved', label: 'Achieved', color: CHART_COLORS.secondary },
  { key: 'inProgress', label: 'In Progress', color: CHART_COLORS.blue },
  { key: 'pending', label: 'Pending', color: CHART_COLORS.accent },
] as const;

export function GoalBreakdownList({ breakdown, className }: GoalBreakdownListProps) {
  return (
    <ul className={cn('space-y-2.5', className)}>
      {ITEMS.map((item) => (
        <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
          <span className="shrink-0 font-semibold text-foreground">
            {breakdown[item.key].toLocaleString('en-BD')}
          </span>
        </li>
      ))}
    </ul>
  );
}
