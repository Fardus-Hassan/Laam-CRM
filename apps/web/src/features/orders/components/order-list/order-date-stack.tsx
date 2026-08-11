'use client';

import type { OrderListItem } from '@laam/types';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataTableCopyableText } from '@/components/data-table/cells';
import { cn } from '@/lib/utils';

export type OrderDateEntry = {
  prefix: string;
  label: string;
  value: string;
};

export function formatOrderDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 || 12;
  // Compact, single-token time so the Date column never wraps.
  return `${day}/${month}/${year} ${hours12}:${minutes}${ampm}`;
}

export function formatOrderDateOnly(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function sameInstant(a: string, b: string): boolean {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a === b;
  return Math.abs(ta - tb) < 1000;
}

/** Build visible date lines for the orders Date column. */
export function buildOrderDateEntries(
  row: Pick<
    OrderListItem,
    'createdAt' | 'updatedAt' | 'followUpDueAt' | 'followUpSetAt' | 'courierBookedAt'
  >,
): OrderDateEntry[] {
  const entries: OrderDateEntry[] = [
    { prefix: 'C', label: 'Created', value: row.createdAt },
  ];

  if (row.updatedAt && !sameInstant(row.updatedAt, row.createdAt)) {
    entries.push({ prefix: 'U', label: 'Last edited', value: row.updatedAt });
  }
  if (row.followUpSetAt) {
    entries.push({ prefix: 'Fs', label: 'Follow-up set', value: row.followUpSetAt });
  }
  if (row.followUpDueAt) {
    entries.push({ prefix: 'F', label: 'Follow-up due', value: row.followUpDueAt });
  }
  if (row.courierBookedAt) {
    entries.push({ prefix: 'B', label: 'Courier booked', value: row.courierBookedAt });
  }

  return entries;
}

export function OrderDateStack({
  row,
  className,
}: {
  row: Pick<
    OrderListItem,
    'createdAt' | 'updatedAt' | 'followUpDueAt' | 'followUpSetAt' | 'courierBookedAt'
  >;
  className?: string;
}) {
  const entries = buildOrderDateEntries(row);
  const copyValue = entries
    .map((e) => {
      const isDueOnly = e.prefix === 'F';
      const formatted = isDueOnly ? formatOrderDateOnly(e.value) : formatOrderDateTime(e.value);
      return `${e.prefix}: ${formatted}`;
    })
    .join('\n');

  return (
    <DataTableCopyableText copyValue={copyValue} copyToastMessage="Dates copied">
      <TooltipProvider delayDuration={150}>
        <div className={cn('space-y-0.5', className)}>
          {entries.map((entry) => {
            const isDueOnly = entry.prefix === 'F';
            const formatted = isDueOnly
              ? formatOrderDateOnly(entry.value)
              : formatOrderDateTime(entry.value);
            return (
              <p
                key={`${entry.prefix}-${entry.value}`}
                className="whitespace-nowrap text-xs tabular-nums leading-snug"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help font-medium text-muted-foreground underline decoration-dotted underline-offset-2">
                      {entry.prefix}:
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    {entry.label}
                  </TooltipContent>
                </Tooltip>{' '}
                <span className="whitespace-nowrap">{formatted}</span>
              </p>
            );
          })}
        </div>
      </TooltipProvider>
    </DataTableCopyableText>
  );
}
