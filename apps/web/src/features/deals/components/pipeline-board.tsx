'use client';

import Link from 'next/link';
import type { PipelineResponse } from '@laam/types';

import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DEAL_STAGE_LABELS } from '@/features/deals/config/deal-filters';
import { formatCurrency } from '@/lib/format';

type PipelineBoardProps = {
  data: PipelineResponse | null;
  isLoading: boolean;
  error: string | null;
  title: string;
  description: string;
};

export function PipelineBoard({ data, isLoading, error, title, description }: PipelineBoardProps) {
  return (
    <PageShell title={title} description={description}>
      <div className="space-y-4">
        <CrmPageActions moduleId="pipeline" />
        <CrmSummaryStrip
          items={[
            { id: 'count', label: 'Total deals', value: data ? String(data.summary.count) : '—' },
            { id: 'amount', label: 'Pipeline value', value: data ? formatCurrency(data.summary.totalAmount) : '—' },
            { id: 'forecast', label: 'Weighted forecast', value: data ? formatCurrency(Math.round(data.summary.weightedAmount)) : '—' },
          ]}
        />

        {isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="custom-scrollbar flex gap-4 overflow-x-auto pb-2">
            {data?.stages
              .filter((stage) => stage.stage !== 'lost')
              .map((stage) => (
                <div key={stage.stage} className="w-72 shrink-0">
                  <Card className="gap-0 py-0 shadow-none">
                    <CardHeader className="border-b px-3 py-2.5">
                      <CardTitle className="flex items-center justify-between text-sm">
                        <span>{DEAL_STAGE_LABELS[stage.stage]}</span>
                        <span className="text-xs font-normal text-muted-foreground">{stage.count}</span>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{formatCurrency(stage.totalAmount)}</p>
                    </CardHeader>
                    <CardContent className="space-y-2 px-2 py-2">
                      {stage.deals.length === 0 ? (
                        <p className="px-2 py-4 text-center text-xs text-muted-foreground">No deals</p>
                      ) : (
                        stage.deals.map((deal) => (
                          <Link
                            key={deal.id}
                            href={`/dashboard/deals/${deal.dealNumber}`}
                            className="block rounded-md border border-border/70 bg-card p-3 transition-colors hover:bg-muted/40"
                          >
                            <p className="text-sm font-medium leading-snug">{deal.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{deal.companyName}</p>
                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="font-medium">{formatCurrency(deal.amount)}</span>
                              <span className="text-muted-foreground">{deal.probability}%</span>
                            </div>
                          </Link>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
