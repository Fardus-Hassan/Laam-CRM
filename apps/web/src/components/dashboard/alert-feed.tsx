import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { AlertItem } from '@laam/types';

import { cn } from '@/lib/utils';

const ALERT_ICONS: Record<AlertItem['type'], LucideIcon> = {
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
  success: CheckCircle2,
};

const ALERT_STYLES: Record<AlertItem['type'], string> = {
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  error: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
};

type AlertFeedProps = {
  items: AlertItem[];
  className?: string;
};

export function AlertFeed({ items, className }: AlertFeedProps) {
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => {
        const Icon = ALERT_ICONS[item.type];

        return (
          <li
            key={item.id}
            className="flex items-start gap-2.5 rounded-lg border border-border/60 p-2.5 sm:gap-3 sm:p-3"
          >
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                ALERT_STYLES[item.type],
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-2 sm:gap-3">
              <p className="min-w-0 flex-1 text-sm leading-snug">{item.message}</p>
              <p className="shrink-0 pt-0.5 text-[11px] text-muted-foreground whitespace-nowrap sm:text-xs">
                {item.timestamp}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
