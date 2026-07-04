'use client';

import Link from 'next/link';
import type { CustomerSegmentCount } from '@laam/types';

import { cn } from '@/lib/utils';

type CustomerSegmentChipsProps = {
  segments: CustomerSegmentCount[];
  activeSegmentId: string;
  className?: string;
};

export function CustomerSegmentChips({
  segments,
  activeSegmentId,
  className,
}: CustomerSegmentChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {segments.map((segment) => {
        const isActive = segment.id === activeSegmentId;
        const href =
          segment.id === 'all'
            ? '/dashboard/customers'
            : `/dashboard/customers?segment=${segment.id}`;

        return (
          <Link
            key={segment.id}
            href={href}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {segment.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                isActive ? 'bg-primary-foreground/20' : 'bg-muted',
              )}
            >
              {segment.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
