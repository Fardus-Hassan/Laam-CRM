import type { KpiMetric } from '@laam/types';
import {
  Activity,
  Briefcase,
  Megaphone,
  Package,
  Server,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const COMPACT_ICONS: Record<string, LucideIcon> = {
  users: Users,
  'user-plus': UserPlus,
  package: Package,
  briefcase: Briefcase,
  megaphone: Megaphone,
  server: Server,
  activity: Activity,
};

type CompactStatGridProps = {
  metrics: KpiMetric[];
  className?: string;
};

export function CompactStatGrid({ metrics, className }: CompactStatGridProps) {
  return (
    <div
      className={cn(
        'flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 sm:snap-none lg:grid-cols-3 xl:grid-cols-6',
        className,
      )}
    >
      {metrics.map((metric) => {
        const Icon = metric.icon ? COMPACT_ICONS[metric.icon] : undefined;

        return (
          <Card
            key={metric.id}
            className="min-w-[68%] shrink-0 snap-start gap-0 py-3 shadow-none sm:min-w-0 sm:shrink"
          >
            <CardContent className="flex items-center gap-3 px-3 sm:px-4">
              {Icon ? (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                  {metric.label}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold sm:text-base">
                  {typeof metric.value === 'number'
                    ? metric.value.toLocaleString('en-BD')
                    : metric.value}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
