import type { AgentIncentiveSummary } from '@laam/types';
import { Calendar, Wallet } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Separator } from '@/components/ui/separator';

type IncentiveSummaryCardProps = {
  data: AgentIncentiveSummary;
  className?: string;
};

export function IncentiveSummaryCard({ data, className }: IncentiveSummaryCardProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:gap-5', className)}>
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 sm:size-16">
          <Wallet
            className="size-7 text-emerald-600 dark:text-emerald-400 sm:size-8"
            aria-hidden
          />
        </div>

        <div className="min-w-0 shrink-0">
          <p className="text-xs text-muted-foreground">
            Total Incentive ({data.periodLabel})
          </p>
          <p className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {formatCurrency(data.totalEarned)}
          </p>
          <p className="mt-0.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Earned
          </p>
        </div>
      </div>

      <div>
        {data.breakdown.map((item, index) => (
          <div key={item.id}>
            {index > 0 ? <Separator className="bg-border/70" /> : null}
            <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="shrink-0 font-semibold text-foreground">
                {formatCurrency(item.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg bg-muted/50 px-3 py-3 text-center sm:flex-row sm:justify-center sm:gap-3 sm:px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
          <Calendar className="size-4 shrink-0" aria-hidden />
          <span>Next Payout Date</span>
        </div>
        <span className="text-xs font-semibold text-foreground sm:text-sm">
          {data.nextPayoutDate}
        </span>
      </div>
    </div>
  );
}
