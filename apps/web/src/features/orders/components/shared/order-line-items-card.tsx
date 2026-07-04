'use client';

import * as React from 'react';
import type { OrderDetail } from '@laam/types';
import { Package } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EditableSectionCard } from '@/features/orders/components/shared/editable-section-card';
import { ProductPicker } from '@/features/orders/components/shared/product-picker';
import { useCreateOrderForm } from '@/features/orders/hooks/use-create-order-form';
import { formatCurrency } from '@/lib/format';

type OrderLineItemsCardProps = {
  order: OrderDetail;
  onSaveLineItems?: (lineItems: OrderDetail['lineItems']) => void | Promise<void>;
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
        productId: '',
        productName: line.productName,
        variationId: '',
        variationLabel: '',
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        discount: 0,
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
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal,
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
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit line items</SheetTitle>
        </SheetHeader>
        <div className="flex-1 py-4">
          <ProductPicker mode="edit" form={form} />
        </div>
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

export function OrderLineItemsCard({ order, onSaveLineItems }: OrderLineItemsCardProps) {
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <>
      <EditableSectionCard
        title="Order items"
        icon={<Package className="size-4 text-primary" />}
        canEdit={false}
      >
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.lineItems.map((line) => (
                <tr key={line.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{line.productName}</p>
                    {line.sku ? <p className="text-xs text-muted-foreground">{line.sku}</p> : null}
                  </td>
                  <td className="px-3 py-2.5">{line.quantity}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatCurrency(line.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end pt-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setSheetOpen(true)}>
            Edit products
          </Button>
        </div>
      </EditableSectionCard>

      <LineItemsEditSheet
        order={order}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={onSaveLineItems}
      />
    </>
  );
}
