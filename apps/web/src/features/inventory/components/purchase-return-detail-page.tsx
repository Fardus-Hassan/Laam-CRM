'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { PurchaseReturnDetail } from '@laam/types';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { inventoryApi } from '@/features/inventory/api/inventory-api';
import { InventorySubNav } from '@/features/inventory/components/inventory-sub-nav';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export function PurchaseReturnDetailPage() {
  const params = useParams<{ returnId: string }>();
  const returnId = params.returnId;
  const [detail, setDetail] = React.useState<PurchaseReturnDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    if (!returnId) return;
    setLoading(true);
    void inventoryApi
      .getPurchaseReturn(returnId)
      .then(setDetail)
      .catch((error) => {
        setDetail(null);
        toast.error(error instanceof Error ? error.message : 'Could not load purchase return');
      })
      .finally(() => setLoading(false));
  }, [returnId]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function approve() {
    if (!detail) return;
    setBusy(true);
    try {
      await inventoryApi.approvePurchaseReturn(detail.id);
      toast.success(`${detail.returnNumber} approved`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve return');
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!detail) return;
    if (!window.confirm(`Reject ${detail.returnNumber}? No stock will be moved.`)) return;
    setBusy(true);
    try {
      await inventoryApi.rejectPurchaseReturn(detail.id);
      toast.success(`${detail.returnNumber} rejected`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reject return');
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!detail) return;
    if (
      !window.confirm(
        `Complete ${detail.returnNumber}? Stock will be deducted for returned lines.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await inventoryApi.completePurchaseReturn(detail.id);
      toast.success(`${detail.returnNumber} completed — stock deducted`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not complete return');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell title="Inventory" description="Purchase return detail.">
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <InventorySubNav />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link href="/dashboard/inventory/purchase-returns">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          {detail ? (
            <div className="min-w-0">
              <h2 className="font-mono text-base font-semibold tracking-tight">
                {detail.returnNumber}
              </h2>
              <p className="text-sm text-muted-foreground">{detail.supplierName}</p>
            </div>
          ) : null}
        </div>

        {loading ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardContent className="h-40 animate-pulse bg-muted/40" />
          </Card>
        ) : !detail ? (
          <Card className={ORDER_CARD_CLASS}>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Purchase return not found.
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
                    <p className="font-semibold tabular-nums">{formatCurrency(detail.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Return date</p>
                    <p>{detail.returnDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Purchase order</p>
                    {detail.purchaseId ? (
                      <Link
                        href={`/dashboard/inventory/purchase/${detail.purchaseId}`}
                        className="font-mono text-primary hover:underline"
                      >
                        {detail.purchaseNumber}
                      </Link>
                    ) : (
                      <p className="font-mono">{detail.purchaseNumber}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={detail.status === 'completed' ? 'default' : 'secondary'}>
                      {detail.status}
                    </Badge>
                  </div>
                  {detail.reason ? (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Reason</p>
                      <p className="text-sm">{detail.reason}</p>
                    </div>
                  ) : null}
                  {detail.completedAt ? (
                    <div className="sm:col-span-2 text-xs text-muted-foreground">
                      Completed {new Date(detail.completedAt).toLocaleString('en-GB')}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className={ORDER_CARD_CLASS}>
                <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                  <CardTitle className="text-sm">Actions</CardTitle>
                </CardHeader>
                <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'space-y-3')}>
                  {detail.status === 'pending' || detail.status === 'approved' ? (
                    <>
                      {detail.status === 'pending' ? (
                        <Button type="button" size="sm" disabled={busy} onClick={() => void approve()}>
                          Approve
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void complete()}
                      >
                        Complete & deduct stock
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => void reject()}
                      >
                        Reject
                      </Button>
                    </>
                  ) : detail.status === 'rejected' ? (
                    <p className="text-sm text-muted-foreground">This return was rejected.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">This return is fully completed.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Lines</CardTitle>
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead className="border-b text-xs text-muted-foreground">
                      <tr>
                        <th className="pb-2 pr-3 font-medium">Product</th>
                        <th className="pb-2 pr-3 font-medium">Variant</th>
                        <th className="pb-2 pr-3 font-medium text-right">Qty</th>
                        <th className="pb-2 pr-3 font-medium text-right">Unit cost</th>
                        <th className="pb-2 font-medium text-right">Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.lines.map((line) => (
                        <tr key={line.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5 pr-3">
                            <p className="font-medium">{line.productName}</p>
                            <p className="font-mono text-xs text-muted-foreground">{line.productSku}</p>
                          </td>
                          <td className="py-2.5 pr-3">
                            <p>{line.variantLabel}</p>
                            <p className="font-mono text-xs text-muted-foreground">{line.variantSku}</p>
                          </td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">{line.quantity}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums">
                            {formatCurrency(line.unitCost)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums font-medium">
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
    </PageShell>
  );
}
