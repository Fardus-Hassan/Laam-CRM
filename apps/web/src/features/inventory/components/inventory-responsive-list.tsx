'use client';

import * as React from 'react';

import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { ORDER_CARD_CLASS } from '@/features/orders/components/create-order/section-layout';
import { useDragToScroll } from '@/hooks/use-drag-to-scroll';
import { cn } from '@/lib/utils';

export type ResponsiveListRow = {
  id: string;
  cells: React.ReactNode[];
  /** Kept for callers; mobile uses the same table layout. */
  mobile?: React.ReactNode;
};

type InventoryResponsiveListProps = {
  headers: string[];
  rows: ResponsiveListRow[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
};

export function InventoryResponsiveList({
  headers,
  rows,
  loading,
  emptyTitle = 'No records',
  emptyDescription = 'Nothing to show yet.',
  className,
}: InventoryResponsiveListProps) {
  const scrollRef = useDragToScroll<HTMLDivElement>({ handleSelector: 'thead' });

  if (loading) {
    return (
      <Card className={cn(ORDER_CARD_CLASS, className)}>
        <CardContent className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/60" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!rows.length) {
    return (
      <Card className={cn(ORDER_CARD_CLASS, className)}>
        <CardContent className="p-6">
          <EmptyState title={emptyTitle} description={emptyDescription} compact />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden', className)}>
      <div
        ref={scrollRef}
        className={cn(
          'custom-scrollbar min-h-[16rem] min-w-0 max-w-full overflow-auto overscroll-contain',
          'max-h-[min(62vh,34rem)] sm:max-h-[min(70vh,44rem)]',
          '[&[data-drag-scrolling=true]]:cursor-grabbing',
          '[&[data-drag-scrolling=true]_thead]:cursor-grabbing',
        )}
      >
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 z-20 cursor-grab select-none bg-card [&_*]:select-none">
            <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              {headers.map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap bg-muted/30 px-3 py-2.5 font-medium sm:px-4"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="select-text">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border/50 transition-colors hover:bg-muted/30"
              >
                {row.cells.map((cell, j) => (
                  <td key={j} className="px-3 py-2.5 align-middle sm:px-4 sm:py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
