import {
  Banknote,
  CheckCircle2,
  PauseCircle,
  Phone,
  ShoppingCart,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { KpiMetric } from '@laam/types';

import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const KPI_ICONS: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  banknote: Banknote,
  'check-circle': CheckCircle2,
  truck: Truck,
  'x-circle': XCircle,
  'pause-circle': PauseCircle,
  phone: Phone,
};

type KpiStatCardProps = {
  metric: KpiMetric;
  className?: string;
};

export function KpiStatCard({ metric, className }: KpiStatCardProps) {
  const Icon = metric.icon ? KPI_ICONS[metric.icon] : undefined;
  const isPositive = metric.trend === 'up';
  const isNegative = metric.trend === 'down';

  return (
    <Card className={cn('gap-0 py-4 shadow-none', className)}>
      <CardContent className="space-y-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
          {Icon ? (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
          ) : null}
        </div>
        <p className="text-2xl font-bold tracking-tight">
          {typeof metric.value === 'number'
            ? metric.value.toLocaleString('en-BD')
            : metric.value}
        </p>
        {metric.changePercent !== undefined ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant={isNegative ? 'danger' : isPositive ? 'success' : 'secondary'}
              className="font-medium"
            >
              {formatPercent(metric.changePercent)}
            </Badge>
            {metric.comparisonLabel ? (
              <span className="text-[11px] text-muted-foreground">
                {metric.comparisonLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type KpiStatGridProps = {
  metrics: KpiMetric[];
  className?: string;
};

export function KpiStatGrid({ metrics, className }: KpiStatGridProps) {
  return (
    <div
      className={cn(
        'flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory sm:grid sm:overflow-visible sm:pb-0 sm:snap-none',
        'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7',
        className,
      )}
    >
      {metrics.map((metric) => (
        <KpiStatCard
          key={metric.id}
          metric={metric}
          className="min-w-[72%] shrink-0 snap-start sm:min-w-0 sm:shrink"
        />
      ))}
    </div>
  );
}
