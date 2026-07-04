import type { LeaderboardRow } from '@laam/types';
import { Trophy } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type LeaderboardListProps = {
  rows: LeaderboardRow[];
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

const TROPHY_COLOR = {
  gold: 'text-amber-500',
  silver: 'text-slate-400',
  bronze: 'text-amber-700',
} as const;

export function LeaderboardList({ rows, className }: LeaderboardListProps) {
  return (
    <ul className={cn('space-y-2', className)}>
      {rows.map((row) => (
        <li
          key={row.id}
          className={cn(
            'flex items-center gap-2 rounded-lg border p-2.5 sm:gap-3 sm:p-3',
            row.isCurrentUser
              ? 'border-primary/40 bg-primary/5'
              : 'border-border/60',
          )}
        >
          <span className="flex w-6 shrink-0 items-center justify-center">
            {row.trophy ? (
              <Trophy className={cn('size-4', TROPHY_COLOR[row.trophy])} />
            ) : (
              <span className="text-xs font-bold text-muted-foreground">
                {row.rank}
              </span>
            )}
          </span>
          <Avatar className="size-8 sm:size-9">
            <AvatarFallback className="bg-muted text-xs">
              {initials(row.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {row.name}
              {row.isCurrentUser ? (
                <span className="ml-1 text-xs font-normal text-primary">(You)</span>
              ) : null}
            </p>
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
