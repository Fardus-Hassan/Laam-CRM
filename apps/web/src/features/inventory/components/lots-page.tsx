'use client';

import * as React from 'react';
import type { InventoryLot, InventoryLotStatus } from '@laam/types';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { ActiveFilterChips } from '@/components/filters/active-filter-chips';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventoryResponsiveList } from '@/features/inventory/components/inventory-responsive-list';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import { ORDER_PAGE_GAP } from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'quarantined', label: 'Quarantined' },
  { value: 'expired', label: 'Expired' },
  { value: 'depleted', label: 'Depleted' },
];

const LOT_STATUS_ACTIONS: InventoryLotStatus[] = [
  'active',
  'quarantined',
  'expired',
  'depleted',
];

export function LotsPage() {
  const [lots, setLots] = React.useState<InventoryLot[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [fefo, setFefo] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const pageSize = 50;
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    void inventoryApi
      .listLots({
        search: search || undefined,
        status: status || undefined,
        fefo,
        page,
        pageSize,
      })
      .then((res) => {
        setLots(res.items);
        setTotal(res.total);
      })
      .catch((error) => {
        setLots([]);
        setTotal(0);
        toast.error(error instanceof Error ? error.message : 'Could not load lots');
      })
      .finally(() => setLoading(false));
  }, [search, status, fefo, page]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function setLotStatus(lot: InventoryLot, next: InventoryLotStatus) {
    setBusyId(lot.id);
    try {
      await inventoryApi.updateLot(lot.id, { status: next });
      toast.success(`${lot.lotNumber} → ${next}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update lot');
    } finally {
      setBusyId(null);
    }
  }

  async function setLotExpiry(lot: InventoryLot, expiresAt: string) {
    setBusyId(lot.id);
    try {
      await inventoryApi.updateLot(lot.id, { expiresAt: expiresAt || null });
      toast.success(`Expiry updated for ${lot.lotNumber}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update expiry');
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageShell title="Inventory" description="Lot tracking with FEFO ordering and status changes.">
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <InventorySubNav />
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">Lots</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              FEFO-sorted lots — edit expiry and move status (active / quarantine / expired).
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <FormField label="Search" className="w-48">
              <FormInput
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Lot, SKU, product"
              />
            </FormField>
            <FormField label="Status" className="w-40">
              <FormSearchSelect
                value={status}
                onChange={(v) => {
                  setPage(1);
                  setStatus(v);
                }}
                options={STATUS_OPTIONS}
                searchable={false}
              />
            </FormField>
            <Button
              type="button"
              size="sm"
              variant={fefo ? 'default' : 'outline'}
              onClick={() => setFefo((v) => !v)}
            >
              FEFO {fefo ? 'on' : 'off'}
            </Button>
          </div>
        </div>

        <ActiveFilterChips
          chips={[
            ...(status
              ? [
                  {
                    id: 'status',
                    label:
                      STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
                  },
                ]
              : []),
            ...(search.trim()
              ? [{ id: 'search', label: `Search: ${search.trim()}` }]
              : []),
            ...(!fefo ? [{ id: 'fefo', label: 'FEFO off' }] : []),
          ]}
          onRemove={(id) => {
            if (id === 'status') setStatus('');
            if (id === 'search') setSearch('');
            if (id === 'fefo') setFefo(true);
            setPage(1);
          }}
          onClearAll={() => {
            setStatus('');
            setSearch('');
            setFefo(true);
            setPage(1);
          }}
        />

        <InventoryResponsiveList
          loading={loading}
          emptyTitle="No lots"
          emptyDescription="Lots appear when purchases are received into stock."
          headers={['Lot', 'Product', 'Warehouse', 'Qty', 'Expires', 'Status', 'Actions']}
          rows={lots.map((lot) => ({
            id: lot.id,
            cells: [
              <span key="l" className="whitespace-nowrap font-mono font-medium">
                {lot.lotNumber}
              </span>,
              <div key="p" className="min-w-0">
                <p className="truncate font-medium">{lot.productName ?? '—'}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {lot.variantSku ?? ''}
                  {lot.variantLabel ? ` · ${lot.variantLabel}` : ''}
                </p>
              </div>,
              <span key="w" className="whitespace-nowrap text-muted-foreground">
                {lot.warehouseName ?? '—'}
              </span>,
              <span key="q" className="tabular-nums">
                {lot.quantity}
                {lot.unitCost !== undefined ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    @ {formatCurrency(lot.unitCost)}
                  </span>
                ) : null}
              </span>,
              <FormInput
                key="e"
                type="date"
                className="w-36"
                disabled={busyId === lot.id}
                value={lot.expiresAt ? lot.expiresAt.slice(0, 10) : ''}
                onChange={(e) => void setLotExpiry(lot, e.target.value)}
              />,
              <Badge key="s" variant={lot.status === 'active' ? 'default' : 'secondary'}>
                {lot.status}
                {lot.daysToExpiry !== undefined ? ` · ${lot.daysToExpiry}d` : ''}
              </Badge>,
              <div key="a" className="flex flex-wrap gap-1">
                {LOT_STATUS_ACTIONS.filter((s) => s !== lot.status).map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busyId === lot.id}
                    onClick={() => void setLotStatus(lot, s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>,
            ],
          }))}
        />

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages} · {total} lots
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
