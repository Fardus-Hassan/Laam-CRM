'use client';

import * as React from 'react';
import type { OrderDetail } from '@laam/types';
import { Package, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EditableSectionCard } from '@/features/orders/components/shared/editable-section-card';
import { ProductPicker } from '@/features/orders/components/shared/product-picker';
import { useCreateOrderForm } from '@/features/orders/hooks/use-create-order-form';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type OrderLineItemsCardProps = {
  order: OrderDetail;
  onSaveLineItems?: (lineItems: OrderDetail['lineItems']) => void | Promise<void>;
  onReturned?: (order: OrderDetail) => void;
};

function LineItemsEditSheet({
  order,
  open,
  onOpenChange,
  onSave,
}: {
  order: OrderDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (lineItems: OrderDetail['lineItems']) => void | Promise<void>;
}) {
  const form = useCreateOrderForm();
  const [saving, setSaving] = React.useState(false);
  const { patch } = form;

  React.useEffect(() => {
    if (!open) return;
    patch({
      lineItems: order.lineItems.map((line) => ({
        id: line.id,
        productId: line.productId ?? '',
        productName: line.productName,
        variationId: line.variantId ?? '',
        variationLabel: line.variationLabel ?? '',
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        discount: line.discount ?? 0,
        subtotal: line.lineTotal,
      })),
    });
  }, [open, order.lineItems, patch]);

  async function handleSave() {
    if (!onSave) {
      toast.info('Line item updates will sync when the API is connected.');
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      const nextLineItems = form.state.lineItems.map((line, index) => {
        const existing = order.lineItems[index];
        const lineTotal = line.quantity * line.unitPrice - line.discount;
        return {
          id: existing?.id ?? line.id,
          productName: line.productName,
          sku: existing?.sku,
          productId: line.productId || existing?.productId,
          variantId: line.variationId || existing?.variantId,
          variationLabel: line.variationLabel || existing?.variationLabel,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          lineTotal,
          imageUrl: existing?.imageUrl,
        };
      });
      await onSave(nextLineItems);
      onOpenChange(false);
      toast.success('Line items updated');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Edit line items</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex-1 overflow-y-auto py-4">
          <ProductPicker mode="edit" form={form} />
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ProductThumb({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className="size-14 rounded-lg border border-border/60 object-cover sm:size-16"
      />
    );
  }
  return (
    <div className="flex size-14 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/40 sm:size-16">
      <Package className="size-5 text-muted-foreground" />
    </div>
  );
}

export function OrderLineItemsCard({
  order,
  onSaveLineItems,
  onReturned,
}: OrderLineItemsCardProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);
  const [returnQty, setReturnQty] = React.useState<Record<string, number>>({});
  const [returning, setReturning] = React.useState(false);
  const itemCount = order.lineItems.reduce((sum, line) => sum + line.quantity, 0);
  const canReturn = order.lineItems.some(
    (line) => (line.returnedQuantity ?? 0) < line.quantity,
  );

  React.useEffect(() => {
    if (!returnOpen) return;
    const next: Record<string, number> = {};
    for (const line of order.lineItems) {
      next[line.id] = 0;
    }
    setReturnQty(next);
  }, [returnOpen, order.lineItems]);

  async function submitReturn() {
    const lines = Object.entries(returnQty)
      .filter(([, qty]) => qty > 0)
      .map(([lineItemId, quantity]) => ({ lineItemId, quantity }));
    if (lines.length === 0) {
      toast.error('Select at least one return quantity');
      return;
    }
    setReturning(true);
    try {
      const { ordersApi } = await import('@/features/orders/api/orders-api');
      const updated = await ordersApi.returnLines(order.id, { lines });
      toast.success('Return recorded');
      setReturnOpen(false);
      onReturned?.(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Return failed');
    } finally {
      setReturning(false);
    }
  }

  return (
    <>
      <EditableSectionCard
        title="Order Products"
        icon={<Package className="size-4 text-primary" />}
        canEdit={false}
        className="overflow-hidden"
        headerExtra={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-md font-normal tabular-nums">
              {order.lineItems.length} line{order.lineItems.length === 1 ? '' : 's'} · {itemCount}{' '}
              qty
            </Badge>
            {canReturn ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs"
                onClick={() => setReturnOpen(true)}
              >
                Return items
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 px-2.5 text-xs"
              title={
                order.stockDeducted
                  ? 'Stock held — saving product changes will adjust inventory'
                  : 'Edit products'
              }
              onClick={() => setSheetOpen(true)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          </div>
        }
      >
        <div className="divide-y divide-border/70 -mx-3 -mb-2 sm:-mx-3">
          {order.lineItems.map((line, index) => {
            const unitDiscount = line.discount ?? 0;
            const gross = line.quantity * line.unitPrice;
            const returned = line.returnedQuantity ?? 0;
            return (
              <div
                key={line.id}
                className={cn(
                  'flex gap-3 px-3 py-3.5 transition-colors hover:bg-muted/25',
                  index === 0 && 'pt-1',
                )}
              >
                <ProductThumb name={line.productName} imageUrl={line.imageUrl} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-semibold leading-snug">{line.productName}</p>
                      {line.variationLabel ? (
                        <p className="text-xs text-muted-foreground">{line.variationLabel}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatCurrency(line.lineTotal)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {line.sku ? (
                      <span className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono">
                        {line.sku}
                      </span>
                    ) : null}
                    <span className="tabular-nums">
                      {formatCurrency(line.unitPrice)} × {line.quantity}
                    </span>
                    {returned > 0 ? (
                      <span className="tabular-nums text-amber-700">Returned {returned}</span>
                    ) : null}
                    {unitDiscount > 0 ? (
                      <span className="tabular-nums text-destructive">
                        −{formatCurrency(unitDiscount)} disc
                      </span>
                    ) : null}
                    {unitDiscount > 0 ? (
                      <span className="tabular-nums line-through opacity-60">
                        {formatCurrency(gross)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-3 text-sm">
          <span className="text-muted-foreground">Items subtotal</span>
          <span className="font-semibold tabular-nums">{formatCurrency(order.subtotal)}</span>
        </div>
      </EditableSectionCard>

      <LineItemsEditSheet
        order={order}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={onSaveLineItems}
      />

      <Sheet open={returnOpen} onOpenChange={setReturnOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Return items</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Enter how many units to return per line. Stock restocks for returned qty when stock
              was previously deducted.
            </p>
            {order.lineItems.map((line) => {
              const returned = line.returnedQuantity ?? 0;
              const remaining = Math.max(0, line.quantity - returned);
              return (
                <div key={line.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{line.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      Remaining {remaining} / {line.quantity}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={remaining}
                    className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm tabular-nums"
                    value={returnQty[line.id] ?? 0}
                    disabled={remaining === 0}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      const qty = Number.isFinite(raw)
                        ? Math.max(0, Math.min(remaining, Math.floor(raw)))
                        : 0;
                      setReturnQty((prev) => ({ ...prev, [line.id]: qty }));
                    }}
                  />
                </div>
              );
            })}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitReturn()} disabled={returning}>
              {returning ? 'Saving…' : 'Confirm return'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Standalone Return items control for the always-editable detail page. */
export function OrderReturnItemsButton({
  order,
  onReturned,
}: {
  order: OrderDetail;
  onReturned?: (order: OrderDetail) => void;
}) {
  const [returnOpen, setReturnOpen] = React.useState(false);
  const [returnQty, setReturnQty] = React.useState<Record<string, number>>({});
  const [returning, setReturning] = React.useState(false);
  const canReturn = order.lineItems.some(
    (line) => (line.returnedQuantity ?? 0) < line.quantity,
  );

  React.useEffect(() => {
    if (!returnOpen) return;
    const next: Record<string, number> = {};
    for (const line of order.lineItems) {
      next[line.id] = 0;
    }
    setReturnQty(next);
  }, [returnOpen, order.lineItems]);

  if (!canReturn) return null;

  async function submitReturn() {
    const lines = Object.entries(returnQty)
      .filter(([, qty]) => qty > 0)
      .map(([lineItemId, quantity]) => ({ lineItemId, quantity }));
    if (lines.length === 0) {
      toast.error('Select at least one return quantity');
      return;
    }
    setReturning(true);
    try {
      const { ordersApi } = await import('@/features/orders/api/orders-api');
      const updated = await ordersApi.returnLines(order.id, { lines });
      toast.success('Return recorded');
      setReturnOpen(false);
      onReturned?.(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Return failed');
    } finally {
      setReturning(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        onClick={() => setReturnOpen(true)}
      >
        Return items
      </Button>
      <Sheet open={returnOpen} onOpenChange={setReturnOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Return items</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Enter how many units to return per line. Stock restocks for returned qty when stock
              was previously deducted.
            </p>
            {order.lineItems.map((line) => {
              const returned = line.returnedQuantity ?? 0;
              const remaining = Math.max(0, line.quantity - returned);
              return (
                <div key={line.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{line.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      Remaining {remaining} / {line.quantity}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={remaining}
                    className="h-8 w-20 rounded-md border border-input bg-background px-2 text-sm tabular-nums"
                    value={returnQty[line.id] ?? 0}
                    disabled={remaining === 0}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      const qty = Number.isFinite(raw)
                        ? Math.max(0, Math.min(remaining, Math.floor(raw)))
                        : 0;
                      setReturnQty((prev) => ({ ...prev, [line.id]: qty }));
                    }}
                  />
                </div>
              );
            })}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitReturn()} disabled={returning}>
              {returning ? 'Saving…' : 'Confirm return'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
