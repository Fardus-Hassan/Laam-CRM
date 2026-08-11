import type { ReactNode } from 'react';

import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type KeyValueLine = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  bold?: boolean;
};

export function DataTableKeyValueStack({
  lines,
  className,
}: {
  lines: KeyValueLine[];
  className?: string;
}) {
  return (
    <div className={cn('space-y-0.5 text-[11px]', className)}>
      {lines.map((line) => (
        <div
          key={line.label}
          className={cn(
            'flex items-baseline justify-between gap-2',
            line.bold && 'font-semibold',
          )}
        >
          <span className="shrink-0 text-muted-foreground">{line.label}</span>
          <span className={cn('text-right tabular-nums', line.valueClassName)}>{line.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Compact order totals — total hero + paid/due pair; discount only when set.
 * No decorative chart: clear hierarchy, scannable amounts.
 */
export function DataTableMoneySummary({
  subtotal,
  discount,
  paid,
  due,
  className,
}: {
  subtotal: number;
  discount: number;
  paid: number;
  due: number;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Total
        </p>
        <p className="text-sm font-semibold leading-tight tabular-nums tracking-tight text-foreground">
          {formatCurrency(subtotal)}
        </p>
        {discount > 0 ? (
          <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
            Less {formatCurrency(discount)}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-x-2 border-t border-border/60 pt-1.5">
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground">Paid</p>
          <p className="text-[11px] font-medium leading-snug tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(paid)}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[10px] text-muted-foreground">Due</p>
          <p
            className={cn(
              'text-[11px] font-semibold leading-snug tabular-nums',
              due > 0 ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {formatCurrency(due)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DataTableEmptyValue() {
  return <span className="text-sm text-muted-foreground">—</span>;
}
