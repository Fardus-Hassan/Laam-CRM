'use client';

import * as React from 'react';
import Link from 'next/link';
import type { CampaignOverview } from '@laam/types';
import { ExternalLink, Megaphone } from 'lucide-react';

import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { campaignsApi } from '@/features/campaigns/api/campaigns-api';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { downloadCsv } from '@/lib/export-csv';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary'> = {
  active: 'success',
  paused: 'warning',
  ended: 'secondary',
};

type CampaignsPageProps = {
  initialTab?: string;
};

export function CampaignsPage({ initialTab = 'active' }: CampaignsPageProps) {
  const [data, setData] = React.useState<CampaignOverview | null>(null);
  const tab = initialTab === 'budget' || initialTab === 'landing' ? initialTab : 'active';

  React.useEffect(() => {
    void campaignsApi.getOverview().then(setData);
  }, []);

  function handleExport() {
    if (!data) return;
    downloadCsv(
      'campaigns.csv',
      ['Name', 'Status', 'Platform', 'Spend', 'Revenue', 'ROAS', 'Leads', 'Orders'],
      data.campaigns.map((c) => [
        c.name,
        c.status,
        c.platform,
        c.spendBdt,
        c.revenueBdt,
        c.roas,
        c.leads,
        c.orders,
      ]),
    );
  }

  return (
    <PageShell
      title="Campaigns"
      description="Facebook, Instagram, and Google ads — spend, ROAS, and landing performance."
    >
      <div className={ORDER_PAGE_GAP}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 border-b pb-2">
            {[
              { id: 'active', label: 'Campaigns', href: '/dashboard/campaigns' },
              { id: 'budget', label: 'Ad Budget', href: '/dashboard/campaigns?tab=budget' },
              { id: 'landing', label: 'Landing Pages', href: '/dashboard/campaigns?tab=landing' },
            ].map((t) => (
              <Link
                key={t.id}
                href={t.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm',
                  tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handleExport}>Export CSV</Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/dashboard/reports?view=marketing">Meta Ads report</Link>
            </Button>
          </div>
        </div>

        <CrmSummaryStrip
          items={[
            { id: 'spend', label: 'Total spend', value: data ? formatCurrency(data.totalSpendBdt) : '—' },
            { id: 'revenue', label: 'Attributed revenue', value: data ? formatCurrency(data.totalRevenueBdt) : '—' },
            { id: 'roas', label: 'Avg ROAS', value: data ? `${data.avgRoas}x` : '—' },
            { id: 'leads', label: 'Leads', value: data ? String(data.totalLeads) : '—' },
          ]}
        />

        {tab === 'landing' ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Landing pages</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead>Visits</TableHead>
                    <TableHead>Conversions</TableHead>
                    <TableHead>Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.landingPages.map((lp) => (
                    <TableRow key={lp.id}>
                      <TableCell>
                        <p className="font-medium">{lp.name}</p>
                        <a href={lp.url} className="flex items-center gap-1 text-xs text-primary hover:underline" target="_blank" rel="noreferrer">
                          {lp.url} <ExternalLink className="size-3" />
                        </a>
                      </TableCell>
                      <TableCell>{lp.visits.toLocaleString()}</TableCell>
                      <TableCell>{lp.conversions}</TableCell>
                      <TableCell>{lp.conversionRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data?.campaigns.map((c) => {
              const budgetPct = Math.min(100, Math.round((c.spendBdt / c.budgetBdt) * 100));
              return (
                <Card key={c.id} className={ORDER_CARD_CLASS}>
                  <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Megaphone className="size-4 text-muted-foreground" />
                        <p className="font-medium">{c.name}</p>
                        <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                        <Badge variant="outline" className="capitalize">{c.platform}</Badge>
                      </div>
                      <p className="text-sm font-semibold text-primary">{c.roas}x ROAS</p>
                    </div>
                    {tab === 'budget' ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Spend {formatCurrency(c.spendBdt)}</span>
                          <span>Budget {formatCurrency(c.budgetBdt)} ({budgetPct}%)</span>
                        </div>
                        <Progress value={budgetPct} className="h-2" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        <div><p className="text-xs text-muted-foreground">Spend</p><p className="font-medium">{formatCurrency(c.spendBdt)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Revenue</p><p className="font-medium">{formatCurrency(c.revenueBdt)}</p></div>
                        <div><p className="text-xs text-muted-foreground">Leads</p><p className="font-medium">{c.leads}</p></div>
                        <div><p className="text-xs text-muted-foreground">Orders</p><p className="font-medium">{c.orders}</p></div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
