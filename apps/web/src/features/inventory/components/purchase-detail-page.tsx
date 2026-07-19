'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { PurchaseDetail, PurchasePaymentStatus } from '@laam/types';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export function PurchaseDetailPage() {
  const params = useParams<{ purchaseId: string }>();
  const router = useRouter();
  const purchaseId = params.purchaseId;
  const [purchase, setPurchase] = React.useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [paymentStatus, setPaymentStatus] = React.useState<PurchasePaymentStatus>('unpaid');

  const load = React.useCallback(() => {
    if (!purchaseId) return;
    setLoading(true);
    void inventoryApi
      .getPurchase(purchaseId)
      .then((detail) => {
        setPurchase(detail);
        setPaymentStatus(detail.paymentStatus);
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

  async function receiveStock() {
    if (!purchase) return;
    setBusy(true);
    try {
      await inventoryApi.receivePurchase(purchase.id);
      toast.success(`Stock received for ${purchase.purchaseNumber}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not receive stock');
    } finally {
      setBusy(false);
    }
  }

  async function cancelPurchase() {
    if (!purchase) return;
    if (!window.confirm(`Cancel ${purchase.purchaseNumber}? This cannot be undone.`)) return;
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
                  {purchase.receivedAt ? (
                    <div className="sm:col-span-2 text-xs text-muted-foreground">
                      Received {new Date(purchase.receivedAt).toLocaleString('en-GB')}
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
                  {purchase.stockStatus === 'pending' ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void receiveStock()}
                      >
                        Receive stock
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => void cancelPurchase()}
                      >
                        Cancel purchase
                      </Button>
                    </>
                  ) : null}
                  <Button type="button" size="sm" variant="ghost" onClick={() => router.push('/dashboard/inventory/purchase')}>
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
                  <table className="w-full min-w-[36rem] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Product</th>
                        <th className="py-2 pr-3 font-medium">Variant</th>
                        <th className="py-2 pr-3 font-medium">Qty</th>
                        <th className="py-2 pr-3 font-medium">Unit cost</th>
                        <th className="py-2 font-medium">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchase.lines.map((line) => (
                        <tr key={line.id} className="border-b border-border/50">
                          <td className="py-2 pr-3">
                            <p className="font-medium">{line.productName}</p>
                            <p className="font-mono text-xs text-muted-foreground">{line.productSku}</p>
                          </td>
                          <td className="py-2 pr-3">
                            <p>{line.variantLabel}</p>
                            <p className="font-mono text-xs text-muted-foreground">{line.variantSku}</p>
                          </td>
                          <td className="py-2 pr-3 tabular-nums">{line.quantity}</td>
                          <td className="py-2 pr-3 tabular-nums">{formatCurrency(line.unitCost)}</td>
                          <td className="py-2 tabular-nums font-medium">{formatCurrency(line.lineTotal)}</td>
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
    </PageShell>
  );
}
