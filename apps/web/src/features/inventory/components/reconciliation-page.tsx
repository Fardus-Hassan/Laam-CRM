'use client';

import * as React from 'react';
import type { InventoryLot, InventoryReconciliationResponse } from '@laam/types';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventoryResponsiveList } from '@/features/inventory/components/inventory-responsive-list';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import { ORDER_PAGE_GAP } from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const EXPIRY_WINDOW_OPTIONS = [
  { value: '30', label: 'Expiring in 30 days' },
  { value: '60', label: 'Expiring in 60 days' },
  { value: '90', label: 'Expiring in 90 days' },
  { value: '', label: 'All lots' },
];

export function ReconciliationPage() {
  const [data, setData] = React.useState<InventoryReconciliationResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [lots, setLots] = React.useState<InventoryLot[]>([]);
  const [lotsLoading, setLotsLoading] = React.useState(true);
  const [expiryWindow, setExpiryWindow] = React.useState('60');

  const load = React.useCallback(() => {
    setLoading(true);
    void inventoryApi
      .getReconciliation()
      .then(setData)
      .catch((error) => {
        setData(null);
        toast.error(error instanceof Error ? error.message : 'Could not load reconciliation');
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    setLotsLoading(true);
    void inventoryApi
      .listLots(expiryWindow ? Number(expiryWindow) : undefined)
      .then((res) => setLots(res.items))
      .catch((error) => {
        setLots([]);
        toast.error(error instanceof Error ? error.message : 'Could not load lots');
      })
      .finally(() => setLotsLoading(false));
  }, [expiryWindow]);

  return (
    <PageShell
      title="Inventory"
      description="Inventory valuation vs accounting ledger, plus lot expiry tracking."
    >
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <InventorySubNav />
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">Reconciliation</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Stock valuation at cost vs the inventory GL account, with recent journals.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
            {data ? (
              <Badge variant={data.isBalanced ? 'default' : 'destructive'}>
                {data.isBalanced ? 'Balanced' : 'Out of balance'}
              </Badge>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={load}>
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        <CrmSummaryStrip
          items={[
            {
              id: 'valuation',
              label: 'Stock valuation at cost',
              value: data ? formatCurrency(data.inventoryValuationAtCost) : '—',
            },
            {
              id: 'gl',
              label: 'Inventory GL balance',
              value: data ? formatCurrency(data.inventoryGlBalance) : '—',
            },
            {
              id: 'difference',
              label: 'Difference',
              value: data ? formatCurrency(data.difference) : '—',
            },
          ]}
          className="grid-cols-1 sm:grid-cols-3"
        />

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Inventory-related accounts</h3>
          <InventoryResponsiveList
            loading={loading}
            emptyTitle="No accounts"
            emptyDescription="Accounting accounts show once inventory journals are posted."
            headers={['Code', 'Account', 'Debit', 'Credit', 'Balance']}
            rows={(data?.accounts ?? []).map((a) => ({
              id: a.accountCode,
              cells: [
                <span key="c" className="whitespace-nowrap font-mono">{a.accountCode}</span>,
                <span key="n" className="font-medium">{a.accountName}</span>,
                <span key="d" className="tabular-nums">{formatCurrency(a.debit)}</span>,
                <span key="cr" className="tabular-nums">{formatCurrency(a.credit)}</span>,
                <span key="b" className="font-semibold tabular-nums">{formatCurrency(a.balance)}</span>,
              ],
            }))}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Recent inventory journals</h3>
          <InventoryResponsiveList
            loading={loading}
            emptyTitle="No journals"
            emptyDescription="Journals post automatically on purchases, production, and write-offs."
            headers={['Date', 'Description', 'Reference', 'Source', 'Amount']}
            rows={(data?.recentJournals ?? []).map((j) => ({
              id: j.id,
              cells: [
                <span key="d" className="whitespace-nowrap text-muted-foreground">{j.entryDate}</span>,
                <span key="ds" className="max-w-[18rem] truncate">{j.description}</span>,
                <span key="r" className="whitespace-nowrap font-mono text-xs">{j.reference ?? '—'}</span>,
                <Badge key="s" variant="outline">{j.sourceType.replaceAll('_', ' ')}</Badge>,
                <span key="a" className="font-semibold tabular-nums">{formatCurrency(j.amount)}</span>,
              ],
            }))}
          />
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-sm font-medium">Lots & expiry</h3>
            <FormField label="Window" className="w-48">
              <FormSearchSelect
                value={expiryWindow}
                onChange={setExpiryWindow}
                options={EXPIRY_WINDOW_OPTIONS}
                searchable={false}
              />
            </FormField>
          </div>
          <InventoryResponsiveList
            loading={lotsLoading}
            emptyTitle="No lots"
            emptyDescription="Lots appear when stock is received with lot numbers or expiry dates."
            headers={['Lot', 'Product', 'Warehouse', 'Qty', 'Unit cost', 'Expires', 'Status']}
            rows={lots.map((lot) => ({
              id: lot.id,
              cells: [
                <span key="l" className="whitespace-nowrap font-mono font-medium">{lot.lotNumber}</span>,
                <div key="p" className="min-w-0">
                  <p className="truncate font-medium">{lot.productName ?? '—'}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {lot.variantSku ?? ''}
                    {lot.variantLabel ? ` · ${lot.variantLabel}` : ''}
                  </p>
                </div>,
                <span key="w" className="whitespace-nowrap text-muted-foreground">{lot.warehouseName ?? '—'}</span>,
                <span key="q" className="tabular-nums">{lot.quantity}</span>,
                <span key="c" className="tabular-nums">
                  {lot.unitCost !== undefined ? formatCurrency(lot.unitCost) : '—'}
                </span>,
                lot.expiresAt ? (
                  <span
                    key="e"
                    className={cn(
                      'whitespace-nowrap tabular-nums',
                      lot.daysToExpiry !== undefined && lot.daysToExpiry <= 30
                        ? 'font-medium text-red-600'
                        : 'text-muted-foreground',
                    )}
                  >
                    {new Date(lot.expiresAt).toLocaleDateString('en-GB')}
                    {lot.daysToExpiry !== undefined ? ` (${lot.daysToExpiry}d)` : ''}
                  </span>
                ) : (
                  '—'
                ),
                <Badge key="s" variant={lot.status === 'active' ? 'default' : 'secondary'}>
                  {lot.status}
                </Badge>,
              ],
            }))}
          />
        </div>
      </div>
    </PageShell>
  );
}
