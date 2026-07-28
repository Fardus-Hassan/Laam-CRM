'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReportPeriod, ReportViewId } from '@laam/types';
import { Download, RefreshCw, Search } from 'lucide-react';

import { Can } from '@/components/auth/can';
import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { ReportContent } from '@/features/reports/components/report-content';
import {
  DEFAULT_REPORT_VIEW,
  REPORT_CATEGORIES,
  REPORT_VIEWS,
  getReportView,
} from '@/features/reports/config/report-views';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { hasPermission } from '@laam/types';
import {
  ORDER_PAGE_GAP,
} from '@/features/orders/components/create-order/section-layout';
import { reportsApi } from '@/features/reports/api/reports-api';
import { downloadCsv } from '@/lib/export-csv';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'ytd', label: 'Year to date' },
];

type ReportsShellProps = {
  initialView?: string;
  initialPeriod?: string;
};

export function ReportsShell({ initialView, initialPeriod }: ReportsShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { permissions } = usePermissions();
  const [search, setSearch] = React.useState('');
  const [refreshKey, setRefreshKey] = React.useState(0);

  const view = (searchParams.get('view') ?? initialView ?? DEFAULT_REPORT_VIEW) as ReportViewId;
  const period = (searchParams.get('period') ?? initialPeriod ?? '30d') as ReportPeriod;
  const activeView = getReportView(view) ?? getReportView(DEFAULT_REPORT_VIEW)!;

  const visibleViews = REPORT_VIEWS.filter((v) => {
    if (v.permission && !hasPermission(permissions, v.permission)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return v.label.toLowerCase().includes(q) || v.description.toLowerCase().includes(q);
  });

  function navigate(nextView: string, nextPeriod?: ReportPeriod) {
    const params = new URLSearchParams();
    params.set('view', nextView);
    params.set('period', nextPeriod ?? period);
    router.replace(`/dashboard/reports?${params.toString()}`, { scroll: false });
  }

  async function handleExportCsv() {
    const filename = `report-${view}-${period}.csv`;
    if (view === 'summary') {
      const data = await reportsApi.getSummary(period);
      downloadCsv(filename, ['KPI', 'Value', 'Change'], data.kpis.map((k) => [k.label, k.value, k.change ?? '']));
      return;
    }
    if (view === 'sales') {
      const data = await reportsApi.getSales(period);
      downloadCsv(filename, ['KPI', 'Value'], data.kpis.map((k) => [k.label, k.value]));
      return;
    }
    if (view === 'revenue') {
      const data = await reportsApi.getRevenue(period);
      downloadCsv(
        filename,
        ['KPI', 'Value'],
        [
          ...data.kpis.map((k) => [k.label, k.value]),
          ...data.breakdown.map((b) => [`Category: ${b.label}`, b.value]),
        ],
      );
      return;
    }
    if (view === 'product-daily') {
      const data = await reportsApi.getProductDaily(period);
      downloadCsv(filename, ['Day', 'Units'], data.map((d) => [d.label, d.value]));
      return;
    }
    if (view === 'team-targets') {
      const rows = await reportsApi.getTeamTargets(period);
      downloadCsv(
        filename,
        ['Name', 'Target orders', 'Actual orders', 'Target revenue', 'Actual revenue', 'Progress %'],
        rows.map((r) => [
          r.name,
          r.targetOrders,
          r.actualOrders,
          r.targetRevenueBdt,
          r.actualRevenueBdt,
          r.progressPercent,
        ]),
      );
      return;
    }
    if (view === 'upsales') {
      const rows = await reportsApi.getUpsales(period);
      downloadCsv(
        filename,
        ['Base', 'Upsell', 'Count', 'Revenue', 'Rate'],
        rows.map((r) => [r.baseProduct, r.upsellProduct, r.count, r.revenueBdt, r.rate]),
      );
      return;
    }
    if (view === 'platform') {
      const data = await reportsApi.getPlatform();
      downloadCsv(filename, ['KPI', 'Value'], data.kpis.map((k) => [k.label, k.value]));
      return;
    }
    if (view === 'repeat-customers') {
      const rows = await reportsApi.getRepeatCustomers(period);
      downloadCsv(filename, ['Name', 'Mobile', 'Orders', 'Spent', 'Last order'], rows.map((r) => [r.name, r.mobile, r.orderCount, r.totalSpentBdt, r.lastOrderDate]));
      return;
    }
    if (view === 'agents' || view === 'orders-by-employee' || view === 'employee-activity' || view === 'teams') {
      const rows = await reportsApi.getEmployees(view, period);
      downloadCsv(filename, ['Name', 'Role', 'Orders', 'Revenue'], rows.map((r) => [r.name, r.role, r.orders, r.revenueBdt]));
      return;
    }
    if (view === 'sources') {
      const rows = await reportsApi.getLeadSources(period);
      downloadCsv(filename, ['Source', 'Leads', 'Orders', 'Conversion', 'Revenue'], rows.map((r) => [r.source, r.leads, r.orders, r.conversionRate, r.revenueBdt]));
      return;
    }
    if (view === 'login-history') {
      const rows = await reportsApi.getLoginHistory();
      downloadCsv(filename, ['User', 'Email', 'IP', 'Device', 'Time', 'Status'], rows.map((r) => [r.userName, r.email, r.ip, r.device, r.loggedInAt, r.status]));
      return;
    }
    if (view === 'marketing' || view === 'campaign') {
      const data = await reportsApi.getMarketing(period);
      downloadCsv(filename, ['Campaign', 'Spend', 'Revenue', 'ROAS', 'Orders'], data.campaigns.map((c) => [c.name, c.spendBdt, c.revenueBdt, c.roas, c.orders]));
      return;
    }
    const ranked = await reportsApi.getRankedProducts(view, period);
    downloadCsv(filename, ['Rank', 'Product', 'SKU', 'Value', 'Secondary'], ranked.map((r) => [r.rank, r.name, r.sku ?? '', r.value, r.secondaryValue ?? '']));
  }

  return (
    <PageShell
      title="Reports & Analytics"
      description="Sales, products, team performance, marketing ROI, and security insights."
    >
      <div className={ORDER_PAGE_GAP}>
        <CrmPageActions moduleId="reports" />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((p) => (
              <Button
                key={p.value}
                type="button"
                size="sm"
                variant={period === p.value ? 'default' : 'outline'}
                onClick={() => navigate(view, p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setRefreshKey((k) => k + 1)}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Can permission="reports.export">
              <Button type="button" size="sm" variant="outline" onClick={() => void handleExportCsv()}>
                <Download className="size-4" />
                Export CSV
              </Button>
            </Can>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                placeholder="Search reports…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <nav className="space-y-4 rounded-lg border bg-card p-2">
              {REPORT_CATEGORIES.map((cat) => {
                const items = visibleViews.filter((v) => v.category === cat.id);
                if (!items.length) return null;
                return (
                  <div key={cat.id}>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {cat.label}
                    </p>
                    <ul className="space-y-0.5">
                      {items.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => navigate(item.id)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                              view === item.id
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                          >
                            <item.icon className="size-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0 space-y-4">
            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <h2 className="text-base font-semibold">{activeView.label}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{activeView.description}</p>
            </div>
            <ReportContent key={`${view}-${period}-${refreshKey}`} view={view} period={period} />
          </main>
        </div>
      </div>
    </PageShell>
  );
}
