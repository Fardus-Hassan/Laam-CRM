'use client';

import * as React from 'react';
import type { ReportPeriod, ReportViewId } from '@laam/types';

import { SimpleBarChart } from '@/components/charts/simple-bar-chart';
import { DualAxisLineChart } from '@/components/charts/dual-axis-line-chart';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
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
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { reportsApi } from '@/features/reports/api/reports-api';
import {
  ORDER_CARD_CLASS,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type ReportContentProps = {
  view: ReportViewId;
  period: ReportPeriod;
};

export function ReportContent({ view, period }: ReportContentProps) {
  switch (view) {
    case 'summary':
      return <SummaryPanel period={period} />;
    case 'sales':
      return <SalesPanel period={period} />;
    case 'revenue':
      return <RevenuePanel period={period} />;
    case 'repeat-customers':
      return <RepeatCustomersPanel period={period} />;
    case 'product-sales':
    case 'top-sold':
    case 'top-return':
    case 'top-purchased':
    case 'low-stock':
    case 'high-stock':
      return <ProductRankPanel view={view} period={period} />;
    case 'product-daily':
      return <ProductDailyPanel period={period} />;
    case 'agents':
    case 'teams':
    case 'orders-by-employee':
    case 'employee-activity':
      return <EmployeePanel view={view} period={period} />;
    case 'team-targets':
      return <TeamTargetsPanel period={period} />;
    case 'marketing':
    case 'campaign':
      return <MarketingPanel period={period} />;
    case 'sources':
      return <SourcesPanel period={period} />;
    case 'upsales':
      return <UpsalesPanel period={period} />;
    case 'login-history':
      return <LoginHistoryPanel />;
    case 'platform':
      return <PlatformPanel />;
    default:
      return <SummaryPanel period={period} />;
  }
}

function SummaryPanel({ period }: { period: ReportPeriod }) {
  const [data, setData] = React.useState<Awaited<ReturnType<typeof reportsApi.getSummary>> | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setData(null);
    setError(null);
    void reportsApi
      .getSummary(period)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load report'));
  }, [period]);

  if (error) return <ErrorPlaceholder message={error} />;
  if (!data) return <LoadingPlaceholder />;

  return (
    <div className="space-y-4">
      <CrmSummaryStrip items={data.kpis.map((k) => ({ id: k.id, label: k.label, value: k.value, hint: k.hint }))} className="sm:grid-cols-2 xl:grid-cols-3" />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue trend">
          <SimpleBarChart data={data.revenueTrend} valueFormatter={(v) => formatCurrency(v)} />
        </ChartCard>
        <ChartCard title="Orders trend">
          <SimpleBarChart data={data.ordersTrend} valueFormatter={(v) => String(v)} color="hsl(var(--chart-2))" />
        </ChartCard>
      </div>
      <Card className={ORDER_CARD_CLASS}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}><CardTitle className="text-sm">Top products</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">No product sales in this period.</TableCell>
                </TableRow>
              ) : (
                data.topProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.units}</TableCell>
                    <TableCell>{formatCurrency(p.revenueBdt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SalesPanel({ period }: { period: ReportPeriod }) {
  const [data, setData] = React.useState<Awaited<ReturnType<typeof reportsApi.getSales>> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    setData(null);
    setError(null);
    void reportsApi
      .getSales(period)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load report'));
  }, [period]);
  if (error) return <ErrorPlaceholder message={error} />;
  if (!data) return <LoadingPlaceholder />;
  return (
    <div className="space-y-4">
      <CrmSummaryStrip items={data.kpis.map((k) => ({ id: k.id, label: k.label, value: k.value }))} className="sm:grid-cols-2 lg:grid-cols-3" />
      <ChartCard title="Daily orders"><SimpleBarChart data={data.trend} valueFormatter={(v) => String(v)} /></ChartCard>
    </div>
  );
}

function RevenuePanel({ period }: { period: ReportPeriod }) {
  const [data, setData] = React.useState<Awaited<ReturnType<typeof reportsApi.getRevenue>> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    setData(null);
    setError(null);
    void reportsApi
      .getRevenue(period)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load report'));
  }, [period]);
  if (error) return <ErrorPlaceholder message={error} />;
  if (!data) return <LoadingPlaceholder />;
  return (
    <div className="space-y-4">
      <CrmSummaryStrip items={data.kpis.map((k) => ({ id: k.id, label: k.label, value: k.value }))} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Daily revenue"><SimpleBarChart data={data.trend} valueFormatter={(v) => formatCurrency(v)} /></ChartCard>
        <ChartCard title="By category"><SimpleBarChart data={data.breakdown} valueFormatter={(v) => formatCurrency(v)} color="hsl(var(--chart-3))" /></ChartCard>
      </div>
    </div>
  );
}

function RepeatCustomersPanel({ period }: { period: ReportPeriod }) {
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof reportsApi.getRepeatCustomers>> | null>(null);
  React.useEffect(() => { void reportsApi.getRepeatCustomers(period).then(setRows); }, [period]);
  if (!rows) return <LoadingPlaceholder />;
  return (
    <DataTableCard
      title="Repeat customers"
      headers={['Customer', 'Mobile', 'Orders', 'Total spent', 'Last order', 'Avg gap']}
      rows={rows.map((r) => [r.name, r.mobile, String(r.orderCount), formatCurrency(r.totalSpentBdt), r.lastOrderDate, r.avgDaysBetween ? `${r.avgDaysBetween}d` : '—'])}
    />
  );
}

function ProductRankPanel({ view, period }: { view: ReportViewId; period: ReportPeriod }) {
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof reportsApi.getRankedProducts>> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    setRows(null);
    setError(null);
    void reportsApi
      .getRankedProducts(view, period)
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load report'));
  }, [view, period]);
  if (error) return <ErrorPlaceholder message={error} />;
  if (!rows) return <LoadingPlaceholder />;
  const isStock = view === 'low-stock' || view === 'high-stock';
  return (
    <DataTableCard
      title="Product ranking"
      headers={['#', 'Product', 'SKU', isStock ? 'Stock' : 'Units', isStock ? 'Reorder' : 'Revenue']}
      rows={rows.map((r) => [
        String(r.rank),
        r.name,
        r.sku ?? '—',
        `${r.value} ${r.unit ?? ''}`,
        r.secondaryValue != null
          ? isStock
            ? String(r.secondaryValue)
            : formatCurrency(r.secondaryValue)
          : '—',
      ])}
    />
  );
}

function ProductDailyPanel({ period }: { period: ReportPeriod }) {
  const [data, setData] = React.useState<Awaited<ReturnType<typeof reportsApi.getProductDaily>> | null>(null);
  React.useEffect(() => { void reportsApi.getProductDaily(period).then(setData); }, [period]);
  if (!data) return <LoadingPlaceholder />;
  return <ChartCard title="Daily units sold"><SimpleBarChart data={data} valueFormatter={(v) => String(v)} size="lg" showValueLabels /></ChartCard>;
}

function EmployeePanel({ view, period }: { view: ReportViewId; period: ReportPeriod }) {
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof reportsApi.getEmployees>> | null>(null);
  React.useEffect(() => { void reportsApi.getEmployees(view, period).then(setRows); }, [view, period]);
  if (!rows) return <LoadingPlaceholder />;
  const showActivity = view === 'employee-activity';
  return (
    <DataTableCard
      title="Team metrics"
      headers={['Name', 'Role', 'Orders', 'Revenue', 'Conversion', showActivity ? 'Activities' : 'AOV']}
      rows={rows.map((r) => [
        r.name,
        r.role,
        String(r.orders),
        formatCurrency(r.revenueBdt),
        r.conversionRate != null ? `${r.conversionRate}%` : '—',
        showActivity ? String(r.activities ?? 0) : r.avgOrderValue != null ? formatCurrency(r.avgOrderValue) : '—',
      ])}
    />
  );
}

function TeamTargetsPanel({ period }: { period: ReportPeriod }) {
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof reportsApi.getTeamTargets>> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [draft, setDraft] = React.useState({
    monthKey: currentMonthKey(),
    scope: 'agent' as 'agent' | 'team',
    subjectKey: '',
    subjectLabel: '',
    targetOrders: '100',
    targetRevenueBdt: '250000',
  });

  const load = React.useCallback(() => {
    setRows(null);
    setError(null);
    void reportsApi
      .getTeamTargets(period)
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [period]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!draft.subjectKey.trim() || !draft.subjectLabel.trim()) {
      toast.error('Name / key required');
      return;
    }
    setSaving(true);
    try {
      await reportsApi.upsertTarget({
        monthKey: draft.monthKey,
        scope: draft.scope,
        subjectKey: draft.subjectKey.trim(),
        subjectLabel: draft.subjectLabel.trim(),
        targetOrders: Number(draft.targetOrders) || 0,
        targetRevenueBdt: Number(draft.targetRevenueBdt) || 0,
      });
      toast.success('Target saved');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save target');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorPlaceholder message={error} />;
  if (!rows) return <LoadingPlaceholder />;
  return (
    <div className="space-y-4">
      <Card className={ORDER_CARD_CLASS}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Set monthly target (agent or team)</CardTitle>
        </CardHeader>
        <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3')}>
          <FormField label="Month (YYYY-MM)">
            <FormInput
              value={draft.monthKey}
              onChange={(e) => setDraft((d) => ({ ...d, monthKey: e.target.value }))}
              placeholder="2026-07"
            />
          </FormField>
          <FormField label="Scope">
            <FormSearchSelect
              value={draft.scope}
              onChange={(v) => setDraft((d) => ({ ...d, scope: v as 'agent' | 'team' }))}
              options={[
                { value: 'agent', label: 'Agent' },
                { value: 'team', label: 'Team' },
              ]}
              searchable={false}
            />
          </FormField>
          <FormField label={draft.scope === 'agent' ? 'Agent name (exact)' : 'Team id / key'}>
            <FormInput
              value={draft.subjectKey}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  subjectKey: e.target.value,
                  subjectLabel: d.subjectLabel || e.target.value,
                }))
              }
              placeholder={draft.scope === 'agent' ? 'Sakib Ahmed' : 'team-uuid'}
            />
          </FormField>
          <FormField label="Display label">
            <FormInput
              value={draft.subjectLabel}
              onChange={(e) => setDraft((d) => ({ ...d, subjectLabel: e.target.value }))}
            />
          </FormField>
          <FormField label="Target orders">
            <FormInput
              type="number"
              value={draft.targetOrders}
              onChange={(e) => setDraft((d) => ({ ...d, targetOrders: e.target.value }))}
            />
          </FormField>
          <FormField label="Target revenue (BDT)">
            <FormInput
              type="number"
              value={draft.targetRevenueBdt}
              onChange={(e) => setDraft((d) => ({ ...d, targetRevenueBdt: e.target.value }))}
            />
          </FormField>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Saving…' : 'Save target'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No targets or activity for this period yet.</p>
        ) : (
          rows.map((r) => (
            <Card key={r.id} className={ORDER_CARD_CLASS}>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{r.name}</p>
                  <Badge variant={r.progressPercent >= 100 ? 'success' : r.progressPercent >= 80 ? 'warning' : 'secondary'}>
                    {r.progressPercent}%
                  </Badge>
                </div>
                <Progress value={Math.min(100, r.progressPercent)} className="h-2" />
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                  <span>Orders: {r.actualOrders}/{r.targetOrders || '—'}</span>
                  <span>Revenue: {formatCurrency(r.actualRevenueBdt)}</span>
                  <span>Target: {formatCurrency(r.targetRevenueBdt)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function MarketingPanel({ period }: { period: ReportPeriod }) {
  const [data, setData] = React.useState<Awaited<ReturnType<typeof reportsApi.getMarketing>> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [draft, setDraft] = React.useState({
    monthKey: currentMonthKey(),
    campaignName: '',
    spendBdt: '',
    notes: '',
  });

  const load = React.useCallback(() => {
    setData(null);
    setError(null);
    void reportsApi
      .getMarketing(period)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [period]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSaveSpend() {
    if (!draft.campaignName.trim()) {
      toast.error('Campaign name required');
      return;
    }
    setSaving(true);
    try {
      await reportsApi.upsertMarketingSpend({
        monthKey: draft.monthKey,
        campaignName: draft.campaignName.trim(),
        spendBdt: Number(draft.spendBdt) || 0,
        notes: draft.notes.trim() || undefined,
      });
      toast.success('Ad spend saved (manual)');
      setDraft((d) => ({ ...d, campaignName: '', spendBdt: '', notes: '' }));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save spend');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorPlaceholder message={error} />;
  if (!data) return <LoadingPlaceholder />;
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Manual ad spend for now. Match campaign name to order UTM campaign for ROAS. Meta API can replace this later.
      </p>
      <Card className={ORDER_CARD_CLASS}>
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Add / update manual spend</CardTitle>
        </CardHeader>
        <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4')}>
          <FormField label="Month">
            <FormInput
              value={draft.monthKey}
              onChange={(e) => setDraft((d) => ({ ...d, monthKey: e.target.value }))}
              placeholder="2026-07"
            />
          </FormField>
          <FormField label="Campaign name">
            <FormInput
              value={draft.campaignName}
              onChange={(e) => setDraft((d) => ({ ...d, campaignName: e.target.value }))}
              placeholder="Same as UTM campaign"
            />
          </FormField>
          <FormField label="Spend (BDT)">
            <FormInput
              type="number"
              value={draft.spendBdt}
              onChange={(e) => setDraft((d) => ({ ...d, spendBdt: e.target.value }))}
            />
          </FormField>
          <FormField label="Notes">
            <FormInput
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </FormField>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="button" size="sm" disabled={saving} onClick={() => void handleSaveSpend()}>
              {saving ? 'Saving…' : 'Save spend'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CrmSummaryStrip
        items={[
          { id: 'spend', label: 'Ad spend', value: formatCurrency(data.spendBdt) },
          { id: 'revenue', label: 'Attributed revenue', value: formatCurrency(data.revenueBdt) },
          { id: 'roas', label: 'ROAS', value: `${data.roas}x` },
          { id: 'orders', label: 'Orders', value: String(data.orders) },
        ]}
      />
      <ChartCard title="Attributed revenue trend">
        <DualAxisLineChart data={data.trend} leftLabel="Revenue" rightLabel="—" leftFormatter={(v) => formatCurrency(v)} />
      </ChartCard>
      <DataTableCard
        title="Campaigns"
        headers={['Campaign', 'Spend', 'Revenue', 'ROAS', 'Orders']}
        rows={data.campaigns.map((c) => [c.name, formatCurrency(c.spendBdt), formatCurrency(c.revenueBdt), `${c.roas}x`, String(c.orders)])}
      />
    </div>
  );
}

function SourcesPanel({ period }: { period: ReportPeriod }) {
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof reportsApi.getLeadSources>> | null>(null);
  React.useEffect(() => { void reportsApi.getLeadSources(period).then(setRows); }, [period]);
  if (!rows) return <LoadingPlaceholder />;
  return (
    <DataTableCard
      title="Lead sources"
      headers={['Source', 'Leads', 'Orders', 'Conversion', 'Revenue']}
      rows={rows.map((r) => [r.source, String(r.leads), String(r.orders), `${r.conversionRate}%`, formatCurrency(r.revenueBdt)])}
    />
  );
}

function UpsalesPanel({ period }: { period: ReportPeriod }) {
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof reportsApi.getUpsales>> | null>(null);
  React.useEffect(() => { void reportsApi.getUpsales(period).then(setRows); }, [period]);
  if (!rows) return <LoadingPlaceholder />;
  return (
    <DataTableCard
      title="Up-sell pairs"
      headers={['Base product', 'Upsell product', 'Count', 'Revenue', 'Rate']}
      rows={rows.map((r) => [r.baseProduct, r.upsellProduct, String(r.count), formatCurrency(r.revenueBdt), `${r.rate}%`])}
    />
  );
}

function LoginHistoryPanel() {
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof reportsApi.getLoginHistory>> | null>(null);
  React.useEffect(() => { void reportsApi.getLoginHistory().then(setRows); }, []);
  if (!rows) return <LoadingPlaceholder />;
  return (
    <DataTableCard
      title="Login history"
      headers={['User', 'Email', 'IP', 'Device', 'Time', 'Status']}
      rows={rows.map((r) => [
        r.userName,
        r.email,
        r.ip,
        r.device,
        formatDateTime(r.loggedInAt),
        r.status,
      ])}
      statusColumn={5}
    />
  );
}

function PlatformPanel() {
  const [data, setData] = React.useState<Awaited<ReturnType<typeof reportsApi.getPlatform>> | null>(null);
  React.useEffect(() => { void reportsApi.getPlatform().then(setData); }, []);
  if (!data) return <LoadingPlaceholder />;
  return (
    <div className="space-y-4">
      <CrmSummaryStrip items={data.kpis.map((k) => ({ id: k.id, label: k.label, value: k.value }))} />
      <ChartCard title="Platform orders (daily)"><SimpleBarChart data={data.trend} valueFormatter={(v) => String(v)} /></ChartCard>
    </div>
  );
}

function LoadingPlaceholder() {
  return <p className="py-12 text-center text-sm text-muted-foreground">Loading report…</p>;
}

function ErrorPlaceholder({ message }: { message: string }) {
  return (
    <p className="py-12 text-center text-sm text-destructive">
      Could not load report: {message}
    </p>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className={ORDER_CARD_CLASS}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className={ORDER_SECTION_BODY_CLASS}>{children}</CardContent>
    </Card>
  );
}

function DataTableCard({
  title,
  headers,
  rows,
  statusColumn,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  statusColumn?: number;
}) {
  return (
    <Card className={ORDER_CARD_CLASS}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => (
                  <TableCell key={j} className={j === 0 ? 'font-medium' : undefined}>
                    {statusColumn === j ? (
                      <Badge variant={cell === 'success' ? 'success' : cell === 'failed' ? 'destructive' : 'secondary'}>
                        {cell}
                      </Badge>
                    ) : cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
