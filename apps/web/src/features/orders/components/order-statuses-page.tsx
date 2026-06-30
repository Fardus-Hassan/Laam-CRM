'use client';

import Link from 'next/link';

import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { MOCK_ORDER_STATUSES } from '@/features/orders/data/mock-status-config';
import { getStatusCount } from '@/features/orders/data/mock-status-counts';
import { cn } from '@/lib/utils';

export function OrderStatusesPage() {
  const statuses = [...MOCK_ORDER_STATUSES].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <PageShell
      title="All Statuses"
      description="Open any order status queue — including filter-only statuses."
    >
      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Status queues</CardTitle>
        </CardHeader>
        <CardContent className={cn('grid gap-2 sm:grid-cols-2 lg:grid-cols-3', ORDER_SECTION_BODY_CLASS)}>
          {statuses.map((status) => (
            <Link
              key={status.slug}
              href={`/dashboard/orders?status=${status.slug}`}
              className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
            >
              <span>
                <span className="font-medium">{status.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">({status.displayMode})</span>
              </span>
              <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-amber-950 tabular-nums">
                {getStatusCount(status.slug)}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
