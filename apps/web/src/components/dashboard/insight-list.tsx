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
  success: 'text-primary',
  info: 'text-[var(--brand-chart-blue,#3B82F6)]',
  warning: 'text-[var(--brand-accent,#FFD700)]',
  trend: 'text-[var(--brand-chart-purple,#8B5CF6)]',
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
