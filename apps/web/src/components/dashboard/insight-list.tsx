import { Lightbulb, TrendingUp, Info, AlertTriangle } from 'lucide-react';
import type { InsightItem } from '@laam/types';

import { cn } from '@/lib/utils';

const INSIGHT_ICONS = {
  success: TrendingUp,
  info: Info,
  warning: AlertTriangle,
  trend: Lightbulb,
} as const;

const INSIGHT_STYLES = {
  success: 'text-emerald-600 dark:text-emerald-400',
  info: 'text-blue-600 dark:text-blue-400',
  warning: 'text-amber-600 dark:text-amber-400',
  trend: 'text-violet-600 dark:text-violet-400',
} as const;

type InsightListProps = {
  items: InsightItem[];
  className?: string;
};

export function InsightList({ items, className }: InsightListProps) {
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => {
        const Icon = INSIGHT_ICONS[item.type];

        return (
          <li key={item.id} className="flex gap-2.5 text-sm leading-snug">
            <Icon
              className={cn('mt-0.5 size-4 shrink-0', INSIGHT_STYLES[item.type])}
              aria-hidden
            />
            <p className="min-w-0 flex-1 text-foreground">{item.message}</p>
          </li>
        );
      })}
    </ul>
  );
}
