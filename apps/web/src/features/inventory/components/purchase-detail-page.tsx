'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { PurchaseDetail, PurchasePaymentStatus, Warehouse } from '@laam/types';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfirmDialog } from '@/components/ui/use-confirm-dialog';
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
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type ReceiveLineState = {
  quantity: string;
  expiresAt: string;
};

export function PurchaseDetailPage() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const params = useParams<{ purchaseId: string }>();
  const router = useRouter();
  const purchaseId = params.purchaseId;
  const [purchase, setPurchase] = React.useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [paymentStatus, setPaymentStatus] = React.useState<PurchasePaymentStatus>('unpaid');
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = React.useState('');
  const [receiveLines, setReceiveLines] = React.useState<Record<string, ReceiveLineState>>({});
  const [editNotes, setEditNotes] = React.useState('');
  const [editDueDate, setEditDueDate] = React.useState('');
  const [editLines, setEditLines] = React.useState<
    Record<string, { quantity: string; unitCost: string }>
  >({});

  const load = React.useCallback(() => {
    if (!purchaseId) return;
    setLoading(true);
    void Promise.all([
      inventoryApi.getPurchase(purchaseId),
      inventoryApi.listWarehouses().catch(() => ({ items: [] as Warehouse[] })),
    ])
      .then(([detail, warehouseRes]) => {
        setPurchase(detail);
        setPaymentStatus(detail.paymentStatus);
        setEditNotes(detail.notes ?? '');
        setEditDueDate(detail.dueDate ?? '');
        const lineEdits: Record<string, { quantity: string; unitCost: string }> = {};
        for (const line of detail.lines) {
          lineEdits[line.id] = {
            quantity: String(line.quantity),
            unitCost: String(line.unitCost),
          };
        }
        setEditLines(lineEdits);
        setWarehouses(warehouseRes.items);
        const defaultWh =
          warehouseRes.items.find((w) => w.isDefault)?.id ?? warehouseRes.items[0]?.id ?? '';
        setWarehouseId(defaultWh);
        const next: Record<string, ReceiveLineState> = {};
        for (const line of detail.lines) {
          next[line.id] = {
            quantity: String(line.remainingQuantity),
            expiresAt: '',
          };
        }
        setReceiveLines(next);
      })
      .catch((error) => {
        setPurchase(null);
        toast.error(error instanceof Error ? error.message : 'Could not load purchase');
      })
      .finally(() => setLoading(false));
  }, [purchaseId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const paymentOptions = (Object.keys(PURCHASE_PAYMENT_LABELS) as PurchasePaymentStatus[]).map(
    (value) => ({ value, label: PURCHASE_PAYMENT_LABELS[value] }),
  );

  const canReceive =
    purchase?.stockStatus === 'pending' || purchase?.stockStatus === 'partial';
  const canEdit = purchase?.stockStatus === 'pending';

  async function savePayment() {
    if (!purchase) return;
    setBusy(true);
    try {
      const updated = await inventoryApi.updatePurchasePayment(purchase.id, paymentStatus);
      toast.success(`Payment updated to ${PURCHASE_PAYMENT_LABELS[updated.paymentStatus]}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update payment');
    } finally {
      setBusy(false);
    }
  }

  async function savePurchaseEdits() {
    if (!purchase || !canEdit) return;
    setBusy(true);
    try {
      const lines = purchase.lines.map((line) => {
        const draft = editLines[line.id];
        const quantity = Math.max(1, Math.floor(Number(draft?.quantity ?? line.quantity)));
        const unitCost = Math.max(0, Number(draft?.unitCost ?? line.unitCost));
        return {
          productId: line.productId,
          variantId: line.variantId,
          quantity,
          unitCost,
        };
      });
      await inventoryApi.updatePurchase(purchase.id, {
        notes: editNotes.trim() || null,
        dueDate: editDueDate.trim() || null,
        lines,
      });
      toast.success('Purchase updated');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update purchase');
    } finally {
      setBusy(false);
    }
  }

  async function receiveStock(receiveAllRemaining: boolean) {
    if (!purchase || !canReceive) return;
    setBusy(true);
    try {
      const lines = receiveAllRemaining
        ? undefined
        : purchase.lines
            .map((line) => {
              const state = receiveLines[line.id];
              const qty = Math.max(0, Math.floor(Number(state?.quantity ?? 0)));
              if (qty <= 0 || line.remainingQuantity <= 0) return null;
              return {
                lineId: line.id,
                quantity: Math.min(qty, line.remainingQuantity),
                expiresAt: state?.expiresAt?.trim() || undefined,
              };
            })
            .filter((line): line is NonNullable<typeof line> => line != null);

      if (!receiveAllRemaining && (!lines || lines.length === 0)) {
        toast.error('Enter at least one quantity to receive');
        setBusy(false);
        return;
      }

      const result = await inventoryApi.receivePurchase(purchase.id, {
        warehouseId: warehouseId || undefined,
        lines,
      });
      toast.success(
        result.stockStatus === 'received'
          ? `Fully received ${purchase.purchaseNumber}`
          : `Partial receipt posted for ${purchase.purchaseNumber}`,
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not receive stock');
    } finally {
      setBusy(false);
    }
  }

  async function cancelPurchase() {
    if (!purchase) return;
    const ok = await confirm({
      title: `Cancel ${purchase.purchaseNumber}?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Cancel purchase',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await inventoryApi.cancelPurchase(purchase.id);
      toast.success(`${purchase.purchaseNumber} cancelled`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel purchase');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell title="Inventory" description="Purchase order detail.">
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <InventorySubNav />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link href="/dashboard/inventory/purchase">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          {purchase ? (
            <div className="min-w-0">
              <h2 className="font-mono text-base font-semibold tracking-tight">
                {purchase.purchaseNumber}
              </h2>
              <p className="text-sm text-muted-foreground">{purchase.supplierName}</p>
            </div>
          ) : null}
        </div>

        {loading ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardContent className="h-40 animate-pulse bg-muted/40" />
          </Card>
        ) : !purchase ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Purchase not found.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className={cn(ORDER_CARD_CLASS, 'lg:col-span-2')}>
                <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                  <CardTitle className="text-sm">Summary</CardTitle>
                </CardHeader>
                <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'grid gap-3 sm:grid-cols-2')}>
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-semibold tabular-nums">{formatCurrency(purchase.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p>{purchase.purchaseDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <Badge variant={purchase.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                      {PURCHASE_PAYMENT_LABELS[purchase.paymentStatus]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Stock</p>
                    <Badge variant="outline">{PURCHASE_STOCK_LABELS[purchase.stockStatus]}</Badge>
                  </div>
                  {canEdit ? (
                    <>
                      <FormField label="Due date">
                        <FormInput
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Notes" className="sm:col-span-2">
                        <FormInput
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Optional notes"
                        />
                      </FormField>
                      <div className="sm:col-span-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void savePurchaseEdits()}
                        >
                          Save purchase edits
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {purchase.dueDate ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Due</p>
                          <p>{purchase.dueDate}</p>
                        </div>
                      ) : null}
                      {purchase.notes ? (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-muted-foreground">Notes</p>
                          <p className="text-sm">{purchase.notes}</p>
                        </div>
                      ) : null}
                    </>
                  )}
                  {purchase.receivedAt ? (
                    <div className="sm:col-span-2 text-xs text-muted-foreground">
                      Last received {new Date(purchase.receivedAt).toLocaleString('en-GB')}
                      {purchase.receivedByName ? ` by ${purchase.receivedByName}` : ''}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className={ORDER_CARD_CLASS}>
                <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                  <CardTitle className="text-sm">Actions</CardTitle>
                </CardHeader>
                <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
                  {purchase.stockStatus !== 'cancelled' ? (
                    <>
                      <FormField label="Payment status">
                        <FormSearchSelect
                          value={paymentStatus}
                          onChange={(v) => setPaymentStatus(v as PurchasePaymentStatus)}
                          options={paymentOptions}
                          searchable={false}
                        />
                      </FormField>
                      <Button type="button" size="sm" disabled={busy} onClick={() => void savePayment()}>
                        Update payment
                      </Button>
                    </>
                  ) : null}
                  {canReceive ? (
                    <>
                      <FormField label="Receive into warehouse">
                        <FormSearchSelect
                          value={warehouseId}
                          onChange={setWarehouseId}
                          options={warehouses.map((w) => ({
                            value: w.id,
                            label: `${w.code} · ${w.name}`,
                          }))}
                          searchable={warehouses.length > 6}
                        />
                      </FormField>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => void receiveStock(false)}
                      >
                        Receive selected qty
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void receiveStock(true)}
                      >
                        Receive all remaining
                      </Button>
                      {purchase.stockStatus === 'pending' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => void cancelPurchase()}
                        >
                          Cancel purchase
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push('/dashboard/inventory/purchase')}
                  >
                    Back to list
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Lines</CardTitle>
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[48rem] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Product</th>
                        <th className="py-2 pr-3 font-medium">Ordered</th>
                        <th className="py-2 pr-3 font-medium">Received</th>
                        <th className="py-2 pr-3 font-medium">Remaining</th>
                        {canReceive ? (
                          <>
                            <th className="py-2 pr-3 font-medium">Receive qty</th>
                            <th className="py-2 pr-3 font-medium">Lot expiry</th>
                          </>
                        ) : null}
                        <th className="py-2 pr-3 font-medium">Unit cost</th>
                        <th className="py-2 font-medium">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchase.lines.map((line) => (
                        <tr key={line.id} className="border-b border-border/50">
                          <td className="py-2 pr-3">
                            <p className="font-medium">{line.productName}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {line.productSku} · {line.variantLabel}
                            </p>
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {canEdit ? (
                              <FormInput
                                type="number"
                                min={1}
                                className="w-24"
                                value={editLines[line.id]?.quantity ?? String(line.quantity)}
                                onChange={(e) =>
                                  setEditLines((prev) => ({
                                    ...prev,
                                    [line.id]: {
                                      quantity: e.target.value,
                                      unitCost: prev[line.id]?.unitCost ?? String(line.unitCost),
                                    },
                                  }))
                                }
                              />
                            ) : (
                              line.quantity
                            )}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">{line.receivedQuantity}</td>
                          <td className="py-2 pr-3 tabular-nums">{line.remainingQuantity}</td>
                          {canReceive ? (
                            <>
                              <td className="py-2 pr-3">
                                <FormInput
                                  type="number"
                                  min={0}
                                  max={line.remainingQuantity}
                                  className="w-24"
                                  disabled={line.remainingQuantity <= 0}
                                  value={receiveLines[line.id]?.quantity ?? '0'}
                                  onChange={(e) =>
                                    setReceiveLines((prev) => ({
                                      ...prev,
                                      [line.id]: {
                                        quantity: e.target.value,
                                        expiresAt: prev[line.id]?.expiresAt ?? '',
                                      },
                                    }))
                                  }
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <FormInput
                                  type="date"
                                  className="w-40"
                                  disabled={line.remainingQuantity <= 0}
                                  value={receiveLines[line.id]?.expiresAt ?? ''}
                                  onChange={(e) =>
                                    setReceiveLines((prev) => ({
                                      ...prev,
                                      [line.id]: {
                                        quantity: prev[line.id]?.quantity ?? '0',
                                        expiresAt: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </td>
                            </>
                          ) : null}
                          <td className="py-2 pr-3 tabular-nums">
                            {canEdit ? (
                              <FormInput
                                type="number"
                                min={0}
                                step="0.01"
                                className="w-28"
                                value={editLines[line.id]?.unitCost ?? String(line.unitCost)}
                                onChange={(e) =>
                                  setEditLines((prev) => ({
                                    ...prev,
                                    [line.id]: {
                                      quantity: prev[line.id]?.quantity ?? String(line.quantity),
                                      unitCost: e.target.value,
                                    },
                                  }))
                                }
                              />
                            ) : (
                              formatCurrency(line.unitCost)
                            )}
                          </td>
                          <td className="py-2 tabular-nums font-medium">
                            {formatCurrency(line.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      {confirmDialog}
    </PageShell>
  );
}
