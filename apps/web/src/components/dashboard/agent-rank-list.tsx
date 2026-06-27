import type { AgentRankRow } from '@laam/types';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type AgentRankListProps = {
  rows: AgentRankRow[];
  className?: string;
};

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AgentRankList({ rows, className }: AgentRankListProps) {
  return (
    <ul className={cn('space-y-3', className)}>
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center gap-2 rounded-lg border border-border/60 p-2.5 sm:gap-3 sm:p-3"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {row.rank}
          </span>
          <Avatar className="size-9">
            <AvatarFallback className="bg-muted text-xs">
              {initials(row.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.orders} orders · {formatCurrency(row.revenue, { compact: true })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-primary">{row.score}</p>
            <p className="text-[10px] text-muted-foreground">score</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
