import type { TargetSummary, TeamSubTarget } from '@laam/types';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

type TeamTargetProgressCardProps = {
  overall: TargetSummary;
  subTargets: TeamSubTarget[];
  className?: string;
};

export function TeamTargetProgressCard({
  overall,
  subTargets,
  className,
}: TeamTargetProgressCardProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Overall Target</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(overall.target, { compact: true })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Achieved</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(overall.achieved, { compact: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-semibold text-foreground">
            {overall.achievementPercent.toFixed(2)}%
          </span>
        </div>
        <Progress
          value={overall.achievementPercent}
          className="h-3 bg-muted"
          indicatorClassName="bg-emerald-500"
        />
      </div>

      <Separator className="bg-border/70" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {subTargets.map((target) => (
          <div key={target.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-muted-foreground">{target.label}</span>
              <span className="shrink-0 font-semibold text-foreground">
                {target.achievementPercent}%
              </span>
            </div>
            <Progress
              value={target.achievementPercent}
              className="h-2 bg-muted"
              indicatorClassName="bg-primary"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
