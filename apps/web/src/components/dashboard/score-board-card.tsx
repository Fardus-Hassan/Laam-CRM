import type { ReactNode } from 'react';
import type { AgentScoreBoard } from '@laam/types';
import { ArrowUp, ChevronDown, Shield, Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

type ScoreBoardCardProps = {
  data: AgentScoreBoard;
  className?: string;
};

function StatBlock({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 text-center', className)}>
      <p className="text-[10px] leading-tight text-muted-foreground sm:text-xs">{label}</p>
      <div className="mt-1 text-xs font-semibold text-foreground sm:text-sm">{children}</div>
    </div>
  );
}

export function ScoreBoardCard({ data, className }: ScoreBoardCardProps) {
  const progressPercent = Math.min(
    100,
    Math.round((data.progressCurrent / data.progressTarget) * 100),
  );

  return (
    <div className={cn('flex flex-col gap-4 sm:gap-5', className)}>
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <div className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/60 sm:size-16">
          <Shield
            className="size-7 fill-violet-600/15 text-violet-600 dark:text-violet-400 sm:size-8"
            aria-hidden
          />
          <Star
            className="absolute size-3.5 fill-white text-white sm:size-4"
            aria-hidden
          />
        </div>

        <div className="min-w-0 shrink-0">
          <p className="text-xs text-muted-foreground">Total Score</p>
          <p className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {data.totalScore.toLocaleString('en-BD')}
          </p>
          <div className="mt-0.5 flex items-center gap-0.5">
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {data.rating}
            </span>
            <ChevronDown
              className="size-4 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          </div>
        </div>
      </div>

      <Progress
        value={progressPercent}
        className="h-2.5 bg-muted"
        indicatorClassName="bg-emerald-500 dark:bg-emerald-500"
      />

      <dl className="grid grid-cols-3 gap-2 border-t border-border/60 pt-4 sm:gap-3">
        <StatBlock label="Rank">
          <span>#{data.rank}</span>
        </StatBlock>
        <StatBlock label="This Month">
          <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
            + {data.monthChange}
            <ArrowUp className="size-3.5" aria-hidden />
          </span>
        </StatBlock>
        <StatBlock label="Progress to Next Rank">
          <span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {data.progressCurrent}
            </span>
            <span className="text-muted-foreground"> / {data.progressTarget}</span>
          </span>
        </StatBlock>
      </dl>
    </div>
  );
}
