'use client';

import { CreateOrderProductsSection } from '@/features/orders/components/create-order/create-order-products-section';
import type { CreateOrderFormApi } from '@/features/orders/hooks/use-create-order-form';

type ProductPickerProps =
  | { mode: 'create'; form: CreateOrderFormApi }
  | { mode: 'edit'; form: CreateOrderFormApi };

/** Product catalog search + line items — shared between create and detail edit. */
export function ProductPicker(props: ProductPickerProps) {
  return <CreateOrderProductsSection form={props.form} />;
}
