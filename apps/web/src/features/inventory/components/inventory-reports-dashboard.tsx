'use client';

import * as React from 'react';
import Link from 'next/link';
import type { InventoryReportsResponse } from '@laam/types';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Download,
  Package,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import {
  PURCHASE_PAYMENT_LABELS,
  PURCHASE_STOCK_LABELS,
} from '@/features/inventory/config/product-filters';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { downloadCsv } from '@/lib/export-csv';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export function InventoryReportsDashboard() {
  const [data, setData] = React.useState<InventoryReportsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [appliedFrom, setAppliedFrom] = React.useState('');
  const [appliedTo, setAppliedTo] = React.useState('');

  const load = React.useCallback((from = appliedFrom, to = appliedTo) => {
    setLoading(true);
    void inventoryApi
      .getReports({
        ...(from ? { dateFrom: from } : {}),
        ...(to ? { dateTo: to } : {}),
      })
      .then(setData)
      .catch((error) => {
        setData(null);
        toast.error(error instanceof Error ? error.message : 'Could not load inventory reports');
      })
      .finally(() => setLoading(false));
  }, [appliedFrom, appliedTo]);

  React.useEffect(() => {
    load();
  }, [load]);

  function applyPeriod() {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      toast.error('From date must be on or before To date');
      return;
    }
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
  }

  function clearPeriod() {
    setDateFrom('');
    setDateTo('');
    setAppliedFrom('');
    setAppliedTo('');
  }

  function exportCsv() {
    if (!data) return;
    const rows: (string | number)[][] = [
      ...data.recent.purchases.map((p) => [
        'Purchase',
        p.purchaseNumber,
        p.supplierName,
        p.itemCount,
        p.totalAmount,
        `${p.stockStatus}/${p.paymentStatus}`,
        p.occurredAt.slice(0, 10),
      ]),
      ...data.recent.returns.map((r) => [
        'Return',
        r.returnNumber,
        r.supplierName,
        r.itemCount,
        r.totalAmount,
        r.status,
        r.occurredAt.slice(0, 10),
      ]),
      ...data.recent.production.map((run) => [
        'Production',
        run.batchNumber,
        run.productName,
        run.unitsProduced,
        run.materialCost,
        'completed',
        run.occurredAt.slice(0, 10),
      ]),
      ...data.recent.movements.map((m) => [
        'Movement',
        m.variantSku,
        `${m.productName} (${m.variantLabel})`,
        m.delta,
        '',
        m.reason,
        m.occurredAt.slice(0, 10),
      ]),
      ...data.lowStock.map((row) => [
        'Low stock',
        row.sku,
        `${row.productName} (${row.variantLabel})`,
        row.stock,
        row.stockValueAtCost,
        row.status,
        '',
      ]),
    ];
    const suffix =
      appliedFrom || appliedTo
        ? `${appliedFrom || 'start'}_${appliedTo || 'end'}`
        : new Date().toISOString().slice(0, 10);
    downloadCsv(`inventory-report-${suffix}.csv`, [
      'Type',
      'Reference',
      'Product/Supplier',
      'Quantity',
      'Amount',
      'Status',
      'Date',
    ], rows);
    toast.success('Report exported');
  }

  return (
    <PageShell title="Inventory" description="Stock valuation, low-stock, and recent inventory activity.">
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <InventorySubNav />
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">Reports</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Live stock valuation and operational health.
              {data?.generatedAt
                ? ` Updated ${new Date(data.generatedAt).toLocaleString('en-GB')}`
                : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={exportCsv} disabled={!data}>
              <Download className="size-3.5" />
              Export CSV
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => load()} disabled={loading}>
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        <Card className={ORDER_CARD_CLASS}>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'flex flex-wrap items-end gap-3')}>
            <FormField label="From" className="w-[10rem]">
              <FormInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </FormField>
            <FormField label="To" className="w-[10rem]">
              <FormInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </FormField>
            <Button type="button" size="sm" onClick={applyPeriod}>
              Apply
            </Button>
            {appliedFrom || appliedTo ? (
              <Button type="button" size="sm" variant="ghost" onClick={clearPeriod}>
                Clear
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Filters recent purchases, returns, production, and stock movements. Valuation KPIs stay current.
            </p>
          </CardContent>
        </Card>

        <CrmSummaryStrip
          items={[
            {
              id: 'skus',
              label: 'SKUs',
              value: data ? String(data.summary.skuCount) : '—',
            },
            {
              id: 'units',
              label: 'Stock units',
              value: data ? String(data.summary.totalStockUnits) : '—',
            },
            {
              id: 'value',
              label: 'Value at cost',
              value: data ? formatCurrency(data.summary.inventoryValuationAtCost) : '—',
            },
            {
              id: 'low',
              label: 'Low stock',
              value: data ? String(data.summary.lowStockCount) : '—',
            },
            {
              id: 'po',
              label: 'Pending POs',
              value: data ? String(data.summary.pendingPurchases) : '—',
            },
            {
              id: 'pr',
              label: 'Open returns',
              value: data ? String(data.summary.pendingReturns) : '—',
            },
          ]}
          className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
        />

        {data && data.summary.uncostedSkuCount > 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              {data.summary.uncostedSkuCount} SKU(s) have no cost price — valuation may be understated.
            </p>
          </div>
        ) : null}

        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="size-4" />
                  Low stock
                </CardTitle>
                <Button type="button" size="sm" variant="ghost" asChild>
                  <Link href="/dashboard/inventory/products?filter=low_stock">Open</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              {loading ? (
                <div className="h-24 animate-pulse rounded-md bg-muted/40" />
              ) : !data?.lowStock.length ? (
                <p className="text-sm text-muted-foreground">No low-stock SKUs.</p>
              ) : (
                <ul className="space-y-3">
                  {data.lowStock.slice(0, 8).map((row) => (
                    <li key={row.variantId} className="flex items-start justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/inventory/products/${row.productId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.productName}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.sku} · {row.variantLabel}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={row.status === 'out_of_stock' ? 'destructive' : 'secondary'}>
                          {row.stock}/{row.reorderLevel}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="size-4" />
                Valuation by category
              </CardTitle>
            </CardHeader>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              {loading ? (
                <div className="h-24 animate-pulse rounded-md bg-muted/40" />
              ) : !data?.valuationBreakdown.categories.length ? (
                <p className="text-sm text-muted-foreground">No category valuation data.</p>
              ) : (
                <ul className="space-y-3">
                  {data.valuationBreakdown.categories.map((row) => (
                    <li key={row.id ?? row.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{row.label}</span>
                        <span className="tabular-nums">{formatCurrency(row.valueAtCost)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{
                            width: `${Math.max(
                              4,
                              Math.min(
                                100,
                                data.summary.inventoryValuationAtCost > 0
                                  ? (row.valueAtCost / data.summary.inventoryValuationAtCost) * 100
                                  : 0,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{row.units} units</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <RecentCard
            title="Recent purchases"
            icon={<ShoppingBag className="size-4" />}
            href="/dashboard/inventory/purchase"
            loading={loading}
            empty="No purchases in this period."
          >
            {data?.recent.purchases.map((p) => (
              <li key={p.id} className="space-y-1 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/dashboard/inventory/purchase/${p.id}`}
                    className="font-mono font-medium text-primary hover:underline"
                  >
                    {p.purchaseNumber}
                  </Link>
                  <span className="tabular-nums">{formatCurrency(p.totalAmount)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">
                    {PURCHASE_STOCK_LABELS[p.stockStatus as keyof typeof PURCHASE_STOCK_LABELS] ??
                      p.stockStatus}
                  </Badge>
                  <Badge variant="secondary">
                    {PURCHASE_PAYMENT_LABELS[p.paymentStatus as keyof typeof PURCHASE_PAYMENT_LABELS] ??
                      p.paymentStatus}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">{p.supplierName}</p>
              </li>
            ))}
          </RecentCard>

          <RecentCard
            title="Recent returns"
            icon={<RotateCcw className="size-4" />}
            href="/dashboard/inventory/purchase-returns"
            loading={loading}
            empty="No returns in this period."
          >
            {data?.recent.returns.map((r) => (
              <li key={r.id} className="space-y-1 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/dashboard/inventory/purchase-returns/${r.id}`}
                    className="font-mono font-medium text-primary hover:underline"
                  >
                    {r.returnNumber}
                  </Link>
                  <span className="tabular-nums">{formatCurrency(r.totalAmount)}</span>
                </div>
                <Badge variant={r.status === 'completed' ? 'default' : 'secondary'}>{r.status}</Badge>
                <p className="truncate text-xs text-muted-foreground">{r.supplierName}</p>
              </li>
            ))}
          </RecentCard>

          <RecentCard
            title="Recent production"
            icon={<Package className="size-4" />}
            href="/dashboard/inventory/mixer"
            loading={loading}
            empty="No production in this period."
          >
            {data?.recent.production.map((run) => (
              <li key={run.id} className="space-y-1 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono font-medium">{run.batchNumber}</span>
                  <span className="tabular-nums">{formatCurrency(run.materialCost)}</span>
                </div>
                <p className="truncate text-muted-foreground">
                  {run.unitsProduced}× {run.productName}
                </p>
              </li>
            ))}
          </RecentCard>

          <RecentCard
            title="Stock movements"
            icon={<ArrowLeftRight className="size-4" />}
            href="/dashboard/inventory/stock-movements"
            loading={loading}
            empty="No movements in this period."
          >
            {data?.recent.movements.map((m) => (
              <li key={m.id} className="space-y-1 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/dashboard/inventory/products/${m.productId}`}
                    className="truncate font-medium text-primary hover:underline"
                  >
                    {m.productName}
                  </Link>
                  <span
                    className={cn(
                      'tabular-nums font-medium',
                      m.delta > 0 ? 'text-emerald-600' : 'text-rose-600',
                    )}
                  >
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {m.variantSku} · {m.reason}
                  {m.actorName ? ` · ${m.actorName}` : ''}
                </p>
              </li>
            ))}
          </RecentCard>
        </div>

        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Valuation by brand</CardTitle>
          </CardHeader>
          <CardContent className={ORDER_SECTION_BODY_CLASS}>
            {loading ? (
              <div className="h-24 animate-pulse rounded-md bg-muted/40" />
            ) : !data?.valuationBreakdown.brands.length ? (
              <p className="text-sm text-muted-foreground">No brand valuation data.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.valuationBreakdown.brands.map((row) => (
                  <div key={row.id ?? row.label} className="rounded-md border border-border/60 p-3">
                    <p className="truncate text-sm font-medium">{row.label}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatCurrency(row.valueAtCost)}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.units} units</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function RecentCard({
  title,
  icon,
  href,
  loading,
  empty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  loading: boolean;
  empty: string;
  children?: React.ReactNode;
}) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            {icon}
            {title}
          </CardTitle>
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link href={href}>Open</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className={ORDER_SECTION_BODY_CLASS}>
        {loading ? (
          <div className="h-24 animate-pulse rounded-md bg-muted/40" />
        ) : !hasChildren ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-3">{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}
