import type { MarketMetricRow, SparklineMetric } from '@laam/types';
import {
  Award,
  BarChart3,
  Globe,
  LineChart,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Sparkline } from '@/components/dashboard/sparkline';

const MARKET_ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  award: Award,
  target: Target,
  'trending-up': TrendingUp,
  'bar-chart': BarChart3,
  'line-chart': LineChart,
};

type MarketMetricListProps = {
  items: MarketMetricRow[];
  className?: string;
};

export function MarketMetricList({ items, className }: MarketMetricListProps) {
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => {
        const Icon = item.icon ? MARKET_ICONS[item.icon] : undefined;

        return (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              {Icon ? (
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
              ) : null}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-0.5 text-sm font-semibold sm:text-base">{item.value}</p>
              </div>
            </div>
            {item.changeLabel ? (
              <Badge
                variant={
                  item.trend === 'down'
                    ? 'danger'
                    : item.trend === 'up'
                      ? 'success'
                      : 'secondary'
                }
                className="shrink-0"
              >
                {item.changeLabel}
              </Badge>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

type SparklineMetricListProps = {
  items: SparklineMetric[];
  className?: string;
};

export function SparklineMetricList({ items, className }: SparklineMetricListProps) {
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p className="text-sm font-semibold sm:text-base">
                {typeof item.value === 'number'
                  ? item.value.toLocaleString('en-BD')
                  : item.value}
              </p>
              {item.changePercent !== undefined ? (
                <Badge
                  variant={
                    item.trend === 'down'
                      ? 'danger'
                      : item.trend === 'up'
                        ? 'success'
                        : 'secondary'
                  }
                >
                  {formatPercent(item.changePercent)}
                </Badge>
              ) : null}
            </div>
          </div>
          {item.sparkline?.length ? (
            <Sparkline
              data={item.sparkline}
              trend={item.trend}
              className="h-8 w-20 shrink-0"
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
