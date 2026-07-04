'use client';

import Link from 'next/link';
import type { FollowupQueue } from '@laam/types';

import { cn } from '@/lib/utils';
import { FOLLOWUP_QUEUES } from '@/features/followups/config/followup-queues';

type FollowupQueueTabsProps = {
  activeQueue: FollowupQueue;
  counts?: Partial<Record<FollowupQueue, number>>;
  filter?: string;
  className?: string;
};

export function FollowupQueueTabs({
  activeQueue,
  counts,
  filter,
  className,
}: FollowupQueueTabsProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {FOLLOWUP_QUEUES.map((queue) => {
        const isActive = activeQueue === queue.id;
        const params = new URLSearchParams();
        params.set('queue', String(queue.id));
        if (filter && filter !== 'all') params.set('filter', filter);
        const href = `/dashboard/followups?${params.toString()}`;
        const count = counts?.[queue.id];

        return (
          <Link
            key={queue.id}
            href={href}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {queue.label}
            {count !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  isActive ? 'bg-primary-foreground/20' : 'bg-muted',
                )}
              >
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
