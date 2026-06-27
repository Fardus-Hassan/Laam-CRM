import type { MetricRow } from '@laam/types';

import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

type MetricRowListProps = {
  metrics: MetricRow[];
  className?: string;
};

export function MetricRowList({ metrics, className }: MetricRowListProps) {
  return (
    <ul className={cn('space-y-4', className)}>
      {metrics.map((metric) => (
        <li
          key={metric.id}
          className="flex items-center justify-between gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-0.5 text-lg font-semibold">
              {typeof metric.value === 'number'
                ? metric.value.toLocaleString('en-BD')
                : metric.value}
            </p>
          </div>
          {metric.changePercent !== undefined ? (
            <Badge
              variant={
                metric.trend === 'down'
                  ? 'danger'
                  : metric.trend === 'up'
                    ? 'success'
                    : 'secondary'
              }
            >
              {formatPercent(metric.changePercent)}
            </Badge>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
