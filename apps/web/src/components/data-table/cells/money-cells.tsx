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

/** Compact single-column financial summary for table cells. */
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
  const rows = [
    { label: 'Total', value: formatCurrency(subtotal) },
    { label: 'Less', value: formatCurrency(discount) },
    { label: 'Paid', value: formatCurrency(paid), valueClassName: 'text-primary' },
    { label: 'Due', value: formatCurrency(due), valueClassName: 'text-destructive font-medium' },
  ];

  return (
    <div className={cn('space-y-0.5', className)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-0.5 border-b border-border/40 py-px last:border-b-0"
        >
          <span className="shrink-0 text-[10px] text-muted-foreground">{row.label}</span>
          <span className={cn('text-[11px] tabular-nums', row.valueClassName)}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DataTableEmptyValue() {
  return <span className="text-sm text-muted-foreground">—</span>;
}
