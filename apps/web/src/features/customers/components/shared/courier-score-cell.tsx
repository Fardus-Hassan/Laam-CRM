'use client';

import type { CustomerCourierScore } from '@laam/types';

import { cn } from '@/lib/utils';

type CourierScoreCellProps = {
  score: CustomerCourierScore;
  compact?: boolean;
  className?: string;
};

export function CourierScoreCell({ score, compact, className }: CourierScoreCellProps) {
  const tone =
    score.rate >= 85 ? 'success' : score.rate >= 65 ? 'warning' : 'danger';

  const barColor =
    tone === 'success'
      ? 'bg-emerald-500'
      : tone === 'warning'
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums text-muted-foreground">
        <span>To {score.total}</span>
        <span className="font-semibold text-foreground">{score.rate}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${Math.max(score.rate, score.total > 0 ? 8 : 0)}%` }}
        />
      </div>
      {!compact ? (
        <p className="text-[10px] tabular-nums text-muted-foreground">
          Su {score.success} · Fa {score.failed}
        </p>
      ) : null}
    </div>
  );
}
