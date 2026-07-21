'use client';

import * as React from 'react';
import type { StockMovement, StockMovementListQuery, Warehouse } from '@laam/types';
import { RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Can } from '@/components/auth/can';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventoryResponsiveList } from '@/features/inventory/components/inventory-responsive-list';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { downloadCsv } from '@/lib/export-csv';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

const MOVEMENT_REASON_LABELS: Record<string, string> = {
  purchase_received: 'Purchase received',
  purchase_return: 'Purchase return',
  production_consume: 'Production consume',
  production_output: 'Production output',
  warehouse_transfer_in: 'Transfer in',
  warehouse_transfer_out: 'Transfer out',
  damage: 'Damage',
  expiry: 'Expiry',
  count_correction: 'Count correction',
  gift_sample: 'Gift / sample',
  theft_loss: 'Theft / loss',
  return_in: 'Return in',
  other: 'Other',
};

const REASON_OPTIONS = [
  { value: '', label: 'All reasons' },
  ...Object.entries(MOVEMENT_REASON_LABELS).map(([value, label]) => ({ value, label })),
];

const DIRECTION_OPTIONS = [
  { value: '', label: 'In & out' },
  { value: 'in', label: 'Stock in (+)' },
  { value: 'out', label: 'Stock out (−)' },
];

function reasonLabel(reason: string): string {
  return MOVEMENT_REASON_LABELS[reason] ?? reason.replaceAll('_', ' ');
}

export function StockMovementsPage() {
  const [items, setItems] = React.useState<StockMovement[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [search, setSearch] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [direction, setDirection] = React.useState('');
  const [warehouseId, setWarehouseId] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const load = React.useCallback(() => {
    setLoading(true);
    const query: StockMovementListQuery = {
      page,
      pageSize: PAGE_SIZE,
      search: search.trim() || undefined,
      reason: reason || undefined,
      direction: direction ? (direction as 'in' | 'out') : undefined,
      warehouseId: warehouseId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };
    void inventoryApi
      .listOrgStockMovements(query)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((error) => {
        setItems([]);
        setTotal(0);
        toast.error(error instanceof Error ? error.message : 'Could not load stock movements');
      })
      .finally(() => setLoading(false));
  }, [page, search, reason, direction, warehouseId, dateFrom, dateTo]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    void inventoryApi
      .listWarehouses()
      .then((res) => setWarehouses(res.items))
      .catch(() => setWarehouses([]));
  }, []);

  const warehouseOptions = [
    { value: '', label: 'All warehouses' },
    ...warehouses.map((w) => ({ value: w.id, label: `${w.code} — ${w.name}` })),
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleExport() {
    downloadCsv(
      'stock-movements.csv',
      ['Date', 'Product', 'SKU', 'Variant', 'Warehouse', 'Change', 'Before', 'After', 'Reason', 'Note', 'By'],
      items.map((m) => [
        new Date(m.createdAt).toLocaleString('en-GB'),
        m.productName ?? '',
        m.productSku ?? '',
        m.variantLabel ?? '',
        m.warehouseName ?? '',
        m.delta,
        m.previousStock,
        m.newStock,
        reasonLabel(m.reason),
        m.note ?? '',
        m.actorName ?? '',
      ]),
    );
  }

  return (
    <PageShell title="Inventory" description="Org-wide stock ledger — every movement with reason and audit trail.">
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <InventorySubNav />
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">Stock ledger</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Every stock in/out across products and warehouses.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
            <Button type="button" size="sm" variant="outline" onClick={load}>
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
            <Can permission="inventory.export">
              <Button type="button" size="sm" variant="outline" onClick={handleExport}>
                Export CSV
              </Button>
            </Can>
          </div>
        </div>

        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">Filters</CardTitle>
          </CardHeader>
          <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-3 sm:grid-cols-2 lg:grid-cols-6')}>
            <FormField label="Search" className="lg:col-span-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <FormInput
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Product, SKU, note…"
                  className="pl-9"
                />
              </div>
            </FormField>
            <FormField label="Reason">
              <FormSearchSelect
                value={reason}
                onChange={(v) => {
                  setReason(v);
                  setPage(1);
                }}
                options={REASON_OPTIONS}
                searchable={false}
              />
            </FormField>
            <FormField label="Direction">
              <FormSearchSelect
                value={direction}
                onChange={(v) => {
                  setDirection(v);
                  setPage(1);
                }}
                options={DIRECTION_OPTIONS}
                searchable={false}
              />
            </FormField>
            <FormField label="Warehouse">
              <FormSearchSelect
                value={warehouseId}
                onChange={(v) => {
                  setWarehouseId(v);
                  setPage(1);
                }}
                options={warehouseOptions}
                searchable={false}
              />
            </FormField>
            <FormField label="From / to">
              <div className="flex gap-2">
                <FormInput
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
                <FormInput
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </FormField>
          </CardContent>
        </Card>

        <InventoryResponsiveList
          loading={loading}
          emptyTitle="No stock movements"
          emptyDescription="Movements appear when stock changes — purchases, orders, adjustments, transfers."
          headers={['Date', 'Product', 'Warehouse', 'Change', 'Before → After', 'Reason', 'Note', 'By']}
          rows={items.map((m) => ({
            id: m.id,
            cells: [
              <span key="d" className="whitespace-nowrap text-muted-foreground">
                {new Date(m.createdAt).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>,
              <div key="p" className="min-w-0">
                <p className="truncate font-medium">{m.productName ?? '—'}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {m.variantSku ?? m.productSku ?? ''}
                  {m.variantLabel ? ` · ${m.variantLabel}` : ''}
                </p>
              </div>,
              <span key="w" className="whitespace-nowrap text-muted-foreground">{m.warehouseName ?? '—'}</span>,
              <span
                key="c"
                className={cn('font-semibold tabular-nums', m.delta > 0 ? 'text-emerald-600' : 'text-red-600')}
              >
                {m.delta > 0 ? `+${m.delta}` : m.delta}
              </span>,
              <span key="ba" className="whitespace-nowrap tabular-nums text-muted-foreground">
                {m.previousStock} → {m.newStock}
              </span>,
              <Badge key="r" variant="outline">{reasonLabel(m.reason)}</Badge>,
              <span key="n" className="max-w-[12rem] truncate text-muted-foreground">{m.note ?? '—'}</span>,
              <span key="by" className="whitespace-nowrap text-muted-foreground">{m.actorName ?? '—'}</span>,
            ],
          }))}
        />

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {total} movement{total === 1 ? '' : 's'} · page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
