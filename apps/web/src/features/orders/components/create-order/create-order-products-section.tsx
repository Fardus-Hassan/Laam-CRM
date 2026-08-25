'use client';

import * as React from 'react';
import { FileText, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { OrderDatePicker } from '@/features/orders/components/create-order/order-date-picker';
import { ProductCatalogPanel } from '@/features/orders/components/create-order/product-catalog-panel';

type CreateOrderProductsSectionProps = {
  form: CreateOrderFormApi;
  /** Detail edit sheet: products + catalog only (no status/payment/notes). */
  variant?: 'full' | 'lines-only';
};

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif)$/i;

function isImageAttachment(name: string, url: string) {
  return IMAGE_EXT_RE.test(name) || IMAGE_EXT_RE.test(url);
}

export function CreateOrderProductsSection({
  form,
  variant = 'full',
}: CreateOrderProductsSectionProps) {
  const {
    state,
    errors,
    options,
    getProductById,
    patch,
    updateLineItem,
    removeLineItem,
    uploadAttachment,
    removeAttachment,
  } = form;
  const [pendingPreview, setPendingPreview] = React.useState<{
    name: string;
    url: string;
  } | null>(null);

  const linesOnly = variant === 'lines-only';

  const lineItemsTable = (
    <>
      {state.lineItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
          No products added — pick from the catalog
          {errors.lineItems ? (
            <p className="mt-2 text-xs text-destructive">{errors.lineItems}</p>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className={cn('w-full text-sm', linesOnly ? 'min-w-[520px]' : 'min-w-[680px]')}>
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
                          // eslint-disable-next-line @next/next/no-img-element
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
    </>
  );

  if (linesOnly) {
    return (
      <div className="space-y-4">
        <ProductCatalogPanel
          form={form}
          className="[&_.custom-scrollbar]:h-[200px]"
        />
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
            <CardTitle className="text-sm">
              Listed products
              {state.lineItems.length > 0 ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  ({state.lineItems.length})
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
            {lineItemsTable}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('grid lg:grid-cols-[minmax(0,1fr)_300px]', ORDER_SECTION_GRID_GAP)}>
      <Card className="order-2 gap-0 py-0 shadow-none lg:order-1">
        <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
          <CardTitle className="text-sm">Listed Products</CardTitle>
        </CardHeader>
        <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
          {lineItemsTable}

          <div className={cn('grid sm:grid-cols-2', ORDER_SECTION_GRID_GAP)}>
            <FormField label="Order Status" htmlFor="orderStatus" required>
              <FormSelect
                id="orderStatus"
                value={state.orderStatus}
                onChange={(orderStatus) =>
                  patch({
                    orderStatus,
                    holdFollowUpDate:
                      orderStatus.trim().toLowerCase() === 'hold'
                        ? (state.holdFollowUpDate ?? new Date())
                        : null,
                  })
                }
                options={options.statuses}
                placeholder="Select status"
                searchPlaceholder="Search status…"
              />
            </FormField>
            {state.orderStatus.trim().toLowerCase() === 'hold' ? (
              <OrderDatePicker
                label="Hold follow-up date"
                value={state.holdFollowUpDate ?? new Date()}
                onChange={(date) => patch({ holdFollowUpDate: date })}
                error={errors.holdFollowUpDate}
              />
            ) : null}
            <FormField label="Payment Method" htmlFor="paymentMethod" required>
              <FormSelect
                id="paymentMethod"
                value={state.paymentMethod}
                onChange={(paymentMethod) => patch({ paymentMethod })}
                options={options.paymentMethods}
                placeholder="Select payment"
              />
            </FormField>
          </div>

          <FormField label="Attachments" htmlFor="attachments">
            <FormInput
              id="attachments"
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              className="h-auto cursor-pointer py-2"
              disabled={Boolean(pendingPreview)}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const localUrl = URL.createObjectURL(file);
                setPendingPreview({ name: file.name, url: localUrl });
                void uploadAttachment(file)
                  .then(() => toast.success('Attachment uploaded'))
                  .catch((err: unknown) =>
                    toast.error(err instanceof Error ? err.message : 'Upload failed'),
                  )
                  .finally(() => {
                    URL.revokeObjectURL(localUrl);
                    setPendingPreview(null);
                    event.target.value = '';
                  });
              }}
            />
            {pendingPreview || state.attachments.length > 0 ? (
              <div className="flex flex-wrap gap-3 pt-2">
                {pendingPreview ? (
                  <AttachmentPreviewCard
                    name={pendingPreview.name}
                    url={pendingPreview.url}
                    pending
                  />
                ) : null}
                {state.attachments.map((file) => (
                  <AttachmentPreviewCard
                    key={`${file.name}-${file.url}`}
                    name={file.name}
                    url={file.url}
                    onRemove={() => removeAttachment(file.name)}
                  />
                ))}
              </div>
            ) : null}
          </FormField>

          <div className={cn('grid sm:grid-cols-2 lg:grid-cols-4', ORDER_SECTION_GRID_GAP)}>
            <FormField label="Package weight (kg)" htmlFor="courierWeightKg">
              <FormInput
                id="courierWeightKg"
                type="number"
                min={0.1}
                step={0.1}
                value={state.courierWeightKg}
                onChange={(event) => patch({ courierWeightKg: event.target.value })}
                placeholder="Auto from products"
              />
            </FormField>
            <FormField label="Delivery type" htmlFor="courierDeliveryType">
              <select
                id="courierDeliveryType"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={state.courierDeliveryType}
                onChange={(event) =>
                  patch({
                    courierDeliveryType:
                      event.target.value === 'express' ? 'express' : 'normal',
                  })
                }
              >
                <option value="normal">Normal</option>
                <option value="express">Express</option>
              </select>
            </FormField>
            <FormField label="Courier Note" htmlFor="courierNote" className="sm:col-span-2">
              <FormTextarea
                id="courierNote"
                rows={3}
                value={state.courierNote}
                onChange={(event) => patch({ courierNote: event.target.value })}
                placeholder="Shown as special instruction on Pathao / Carrybee"
              />
            </FormField>
            <FormField label="Packing Note" htmlFor="packingNote" className="sm:col-span-2 lg:col-span-4">
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

function AttachmentPreviewCard({
  name,
  url,
  pending,
  onRemove,
}: {
  name: string;
  url: string;
  pending?: boolean;
  onRemove?: () => void;
}) {
  const isImage = isImageAttachment(name, url);

  return (
    <div
      className={cn(
        'group relative w-[7.5rem] overflow-hidden rounded-lg border bg-muted/40',
        pending && 'opacity-70',
      )}
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob/upload URLs
        <img
          src={url}
          alt={name}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 px-2 text-muted-foreground">
          <FileText className="size-8" />
          <span className="line-clamp-2 text-center text-[10px] leading-tight">{name}</span>
        </div>
      )}
      <div className="truncate border-t bg-background/90 px-1.5 py-1 text-[10px]" title={name}>
        {pending ? 'Uploading…' : name}
      </div>
      {!pending ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-0 z-0"
          aria-label={`Open ${name}`}
          tabIndex={-1}
        />
      ) : null}
      {onRemove ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute right-1 top-1 z-10 size-6 opacity-90 shadow-sm"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${name}`}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
