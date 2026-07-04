'use client';

import * as React from 'react';

import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { ORDER_CARD_CLASS } from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

export type ResponsiveListRow = {
  id: string;
  cells: React.ReactNode[];
  mobile: React.ReactNode;
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
      <div className="divide-y md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="p-4">
            {row.mobile}
          </div>
        ))}
      </div>

      <div className="hidden min-w-0 overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border/50 transition-colors hover:bg-muted/30"
              >
                {row.cells.map((cell, j) => (
                  <td key={j} className="px-4 py-3 align-middle">
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
