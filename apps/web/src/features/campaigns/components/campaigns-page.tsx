'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Campaign, CampaignOverview } from '@laam/types';
import { ExternalLink, Megaphone, Pencil } from 'lucide-react';
import { toast } from 'sonner';

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
import { CampaignFormDialog } from '@/features/campaigns/components/campaign-form-dialog';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
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
  const { can } = usePermissions();
  const [data, setData] = React.useState<CampaignOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Campaign | null>(null);
  const tab = initialTab === 'budget' || initialTab === 'landing' ? initialTab : 'active';

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const overview = await campaignsApi.getOverview();
      setData(overview);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load campaigns');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function handleExport() {
    if (!data) return;
    downloadCsv(
      'campaigns.csv',
      ['Name', 'Status', 'Platform', 'Spend', 'Budget', 'Revenue', 'ROAS', 'Leads', 'Orders'],
      data.campaigns.map((c) => [
        c.name,
        c.status,
        c.platform,
        c.spendBdt,
        c.budgetBdt,
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
      description="Manual campaign registry — name, budget, and attributed ROAS from spend + orders."
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
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handleExport}>
              Export CSV
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/dashboard/reports?view=marketing">Meta Ads report</Link>
            </Button>
            {can('campaigns.create') ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                New campaign
              </Button>
            ) : null}
          </div>
        </div>

        <CrmSummaryStrip
          items={[
            {
              id: 'spend',
              label: 'Total spend',
              value: data ? formatCurrency(data.totalSpendBdt) : '—',
            },
            {
              id: 'revenue',
              label: 'Attributed revenue',
              value: data ? formatCurrency(data.totalRevenueBdt) : '—',
            },
            { id: 'roas', label: 'Avg ROAS', value: data ? `${data.avgRoas}x` : '—' },
            { id: 'leads', label: 'Leads', value: data ? String(data.totalLeads) : '—' },
          ]}
        />

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading campaigns…</p>
        ) : tab === 'landing' ? (
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
                  {(data?.landingPages.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-muted-foreground">
                        No landing pages yet. Add a URL when creating a campaign.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.landingPages.map((lp) => (
                      <TableRow key={lp.id}>
                        <TableCell>
                          <p className="font-medium">{lp.name}</p>
                          <a
                            href={lp.url}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {lp.url} <ExternalLink className="size-3" />
                          </a>
                        </TableCell>
                        <TableCell>{lp.visits.toLocaleString()}</TableCell>
                        <TableCell>{lp.conversions}</TableCell>
                        <TableCell>{lp.conversionRate}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(data?.campaigns.length ?? 0) === 0 ? (
              <Card className={ORDER_CARD_CLASS}>
                <CardContent className={ORDER_SECTION_BODY_CLASS}>
                  <p className="text-sm text-muted-foreground">
                    No campaigns yet. Create a manual campaign with name and budget.
                    Record spend in Reports → Marketing; matching UTM campaign names on
                    orders attribute revenue here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              data?.campaigns.map((c) => {
                const budgetPct =
                  c.budgetBdt > 0
                    ? Math.min(100, Math.round((c.spendBdt / c.budgetBdt) * 100))
                    : 0;
                return (
                  <Card key={c.id} className={ORDER_CARD_CLASS}>
                    <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Megaphone className="size-4 text-muted-foreground" />
                          <p className="font-medium">{c.name}</p>
                          <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                          <Badge variant="outline" className="capitalize">
                            {c.platform}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-primary">{c.roas}x ROAS</p>
                          {can(['campaigns.edit', 'campaigns.manage_budget']) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditing(c);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {tab === 'budget' ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Spend {formatCurrency(c.spendBdt)}</span>
                            <span>
                              Budget {formatCurrency(c.budgetBdt)} ({budgetPct}%)
                            </span>
                          </div>
                          <Progress value={budgetPct} className="h-2" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Spend</p>
                            <p className="font-medium">{formatCurrency(c.spendBdt)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="font-medium">{formatCurrency(c.revenueBdt)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Leads</p>
                            <p className="font-medium">{c.leads}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Orders</p>
                            <p className="font-medium">{c.orders}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      <CampaignFormDialog
        open={formOpen}
        initial={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => void load()}
      />
    </PageShell>
  );
}
