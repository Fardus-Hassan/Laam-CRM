'use client';

import Link from 'next/link';
import type { DealDetail } from '@laam/types';
import { ArrowLeft } from 'lucide-react';

import { EntityStatusBadge } from '@/components/dashboard/entity-status-badge';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

export function DealDetailView({ deal }: { deal: DealDetail }) {
  return (
    <PageShell title={deal.dealNumber} description={deal.title}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/deals">
              <ArrowLeft className="size-4" />
              Back to deals
            </Link>
          </Button>
          <EntityStatusBadge status={deal.stage} kind="deal" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b px-4 py-3"><CardTitle className="text-sm">Deal details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 px-4 py-4 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Customer</p><p className="mt-1 font-medium">{deal.companyName}</p></div>
              <div><p className="text-xs text-muted-foreground">Contact</p><p className="mt-1 font-medium">{deal.contactName ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Amount</p><p className="mt-1 font-medium">{formatCurrency(deal.amount)}</p></div>
              <div><p className="text-xs text-muted-foreground">Probability</p><p className="mt-1 font-medium">{deal.probability}%</p></div>
              <div><p className="text-xs text-muted-foreground">Agent</p><p className="mt-1 font-medium">{deal.assignedAgentName ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Expected close</p><p className="mt-1 font-medium">{deal.expectedCloseDate ?? '—'}</p></div>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0 shadow-none">
            <CardHeader className="border-b px-4 py-3"><CardTitle className="text-sm">Activity</CardTitle></CardHeader>
            <CardContent className="px-4 py-4">
              <ol className="space-y-3">
                {deal.activities.map((a) => (
                  <li key={a.id} className="text-sm">
                    <p className="font-medium">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleString('en-GB')}</p>
                  </li>
                ))}
              </ol>
              {deal.notes ? <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">{deal.notes}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
