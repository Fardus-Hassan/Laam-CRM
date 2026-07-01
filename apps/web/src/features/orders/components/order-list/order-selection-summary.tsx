'use client';

import type { OrderListRow } from '@laam/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type OrderSelectionSummaryProps = {
  rows: OrderListRow[];
  className?: string;
  /** @deprecated Use variant="compact" */
  compact?: boolean;
  variant?: 'inline' | 'compact' | 'card';
};

export function OrderSelectionSummary({
  rows,
  className,
  compact,
  variant = compact ? 'compact' : 'card',
}: OrderSelectionSummaryProps) {
  if (rows.length === 0) {
    return null;
  }

  const productTotal = rows.reduce((sum, row) => sum + row.subtotal, 0);
  const discount = rows.reduce((sum, row) => sum + row.discount, 0);
  const paid = rows.reduce((sum, row) => sum + row.paid, 0);
  const grandTotal = rows.reduce((sum, row) => sum + row.amount, 0);
  const due = rows.reduce((sum, row) => sum + row.due, 0);

  const shipping = rows.reduce(
    (sum, row) => sum + Math.max(0, row.amount - row.subtotal + row.discount),
    0,
  );

  const lines = [
    { label: 'Product Total', value: productTotal },
    { label: 'Shipping', value: shipping },
    { label: 'Discount', value: discount },
    { label: 'Grand Total', value: grandTotal, bold: true },
    { label: 'Paid', value: paid, positive: true },
    { label: 'Due', value: due, danger: true },
  ];

  if (variant === 'inline') {
    const highlights = lines.filter((line) =>
      ['Product Total', 'Grand Total', 'Paid', 'Due'].includes(line.label),
    );

    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border/60 bg-background px-3 py-2',
          className,
        )}
      >
        <span className="text-xs font-medium text-muted-foreground">Selection summary</span>
        {highlights.map((line) => (
          <div key={line.label} className="flex items-baseline gap-1.5 text-xs">
            <span className="text-muted-foreground">{line.label}</span>
            <span
              className={cn(
                'tabular-nums font-medium',
                line.bold && 'font-semibold',
                line.positive && 'text-primary',
                line.danger && 'text-destructive',
              )}
            >
              {formatCurrency(line.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('rounded-lg border bg-muted/30 p-3', className)}>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Selection summary</p>
        <div className="space-y-1">
          {lines.map((line) => (
            <div key={line.label} className="flex justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{line.label}</span>
              <span
                className={cn(
                  'tabular-nums',
                  line.bold && 'font-semibold',
                  line.positive && 'text-primary',
                  line.danger && 'text-destructive',
                )}
              >
                {formatCurrency(line.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const fullLines = [
    ...lines,
    { label: 'Return/Damage', value: 0 },
    { label: 'Return Discount', value: 0, danger: true },
  ];

  return (
    <Card className={cn('gap-0 py-0 shadow-none', className)}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">Summary</CardTitle>
      </CardHeader>
      <CardContent className={cn('space-y-2', ORDER_SECTION_BODY_CLASS)}>
        {fullLines.map((line) => (
          <div
            key={line.label}
            className={cn(
              'flex items-center justify-between gap-2 text-sm',
              line.bold && 'font-semibold',
            )}
          >
            <span className="text-muted-foreground">{line.label}</span>
            <span
              className={cn(
                'tabular-nums',
                line.positive && 'text-primary font-medium',
                line.danger && 'text-destructive',
              )}
            >
              {formatCurrency(line.value)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
