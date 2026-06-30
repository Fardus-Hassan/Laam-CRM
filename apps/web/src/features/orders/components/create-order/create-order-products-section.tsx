'use client';

import { Trash2 } from 'lucide-react';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MOCK_ORDER_STATUSES,
  MOCK_PAYMENT_METHODS,
  getProductById,
} from '@/features/orders/data/mock-create-order';
import type { CreateOrderFormApi } from '@/features/orders/hooks/use-create-order-form';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
  ORDER_STICKY_MAX_H_CLASS,
  ORDER_STICKY_TOP_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { ProductCatalogPanel } from '@/features/orders/components/create-order/product-catalog-panel';

type CreateOrderProductsSectionProps = {
  form: CreateOrderFormApi;
};

export function CreateOrderProductsSection({ form }: CreateOrderProductsSectionProps) {
  const {
    state,
    errors,
    patch,
    updateLineItem,
    removeLineItem,
    addAttachment,
    removeAttachment,
  } = form;

  return (
    <div className={cn('grid lg:grid-cols-[minmax(0,1fr)_300px]', ORDER_SECTION_GRID_GAP)}>
      <Card className="order-2 gap-0 py-0 shadow-none lg:order-1">
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Listed Products</CardTitle>
        </CardHeader>
        <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
          {state.lineItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              No products added — pick from the catalog on the right
              {errors.lineItems ? (
                <p className="mt-2 text-xs text-destructive">{errors.lineItems}</p>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/70">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Name</th>
                    <th className="px-3 py-2.5 font-medium">Variation</th>
                    <th className="px-3 py-2.5 font-medium">Unit Price</th>
                    <th className="px-3 py-2.5 font-medium">Qty</th>
                    <th className="px-3 py-2.5 font-medium">Discount</th>
                    <th className="px-3 py-2.5 font-medium">Subtotal</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {state.lineItems.map((item) => {
                    const product = getProductById(item.productId);

                    return (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {product?.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={item.productName}
                                className="size-10 shrink-0 rounded-md border border-border/60 object-cover"
                              />
                            ) : null}
                            <span className="font-medium">{item.productName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {product && product.variations.length > 1 ? (
                            <FormSelect
                              value={item.variationId}
                              onChange={(variationId) =>
                                updateLineItem(item.id, { variationId })
                              }
                              options={product.variations.map((variation) => ({
                                value: variation.id,
                                label: variation.label,
                              }))}
                              placeholder="Variation"
                            />
                          ) : (
                            item.variationLabel
                          )}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2.5">
                          <FormInput
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) =>
                              updateLineItem(item.id, {
                                quantity: Math.max(1, Number(event.target.value) || 1),
                              })
                            }
                            className="w-20"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <FormInput
                            type="number"
                            min={0}
                            value={item.discount}
                            onChange={(event) =>
                              updateLineItem(item.id, {
                                discount: Math.max(0, Number(event.target.value) || 0),
                              })
                            }
                            className="w-24"
                          />
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {formatCurrency(item.subtotal)}
                        </td>
                        <td className="px-3 py-2.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            onClick={() => removeLineItem(item.id)}
                            aria-label="Remove line"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className={cn('grid sm:grid-cols-2', ORDER_SECTION_GRID_GAP)}>
            <FormField label="Order Status" htmlFor="orderStatus" required>
              <FormSelect
                id="orderStatus"
                value={state.orderStatus}
                onChange={(orderStatus) => patch({ orderStatus })}
                options={MOCK_ORDER_STATUSES}
                searchable={false}
              />
            </FormField>
            <FormField label="Payment Method" htmlFor="paymentMethod" required>
              <FormSelect
                id="paymentMethod"
                value={state.paymentMethod}
                onChange={(paymentMethod) => patch({ paymentMethod })}
                options={MOCK_PAYMENT_METHODS}
                placeholder="Select payment"
              />
            </FormField>
          </div>

          <FormField label="Attachments" htmlFor="attachments">
            <FormInput
              id="attachments"
              type="file"
              className="h-auto cursor-pointer py-2"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  addAttachment(file.name);
                  event.target.value = '';
                }
              }}
            />
            {state.attachmentNames.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {state.attachmentNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="rounded-full bg-muted px-2.5 py-1 text-xs hover:bg-muted/80"
                    onClick={() => removeAttachment(name)}
                  >
                    {name} ×
                  </button>
                ))}
              </div>
            ) : null}
          </FormField>

          <div className={cn('grid lg:grid-cols-2', ORDER_SECTION_GRID_GAP)}>
            <FormField label="Courier Note" htmlFor="courierNote">
              <FormTextarea
                id="courierNote"
                rows={3}
                value={state.courierNote}
                onChange={(event) => patch({ courierNote: event.target.value })}
              />
            </FormField>
            <FormField label="Packing Note" htmlFor="packingNote">
              <FormTextarea
                id="packingNote"
                rows={3}
                value={state.packingNote}
                onChange={(event) => patch({ packingNote: event.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Order Note" htmlFor="orderNote">
            <FormTextarea
              id="orderNote"
              rows={2}
              value={state.orderNote}
              onChange={(event) => patch({ orderNote: event.target.value })}
            />
          </FormField>
        </CardContent>
      </Card>

      <ProductCatalogPanel
        form={form}
        className={cn(
          'order-1 lg:order-2 lg:sticky lg:self-start',
          ORDER_STICKY_TOP_CLASS,
          ORDER_STICKY_MAX_H_CLASS,
        )}
      />
    </div>
  );
}
