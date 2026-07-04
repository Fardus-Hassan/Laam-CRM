import type { ProductCategory, ProductFilter, ProductStatus } from '@laam/types';

export type ProductFilterDefinition = {
  id: ProductFilter;
  label: string;
};

export const PRODUCT_FILTERS: ProductFilterDefinition[] = [
  { id: 'all', label: 'All products' },
  { id: 'low_stock', label: 'Low stock' },
  { id: 'out_of_stock', label: 'Out of stock' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  honey: 'Honey',
  dates: 'Dates',
  combo: 'Combo',
  gift: 'Gift box',
  raw_material: 'Raw material',
  packaging: 'Packaging',
  other: 'Other',
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  discontinued: 'Discontinued',
};

export const STOCK_STATUS_LABELS = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
} as const;

export const ADJUSTMENT_REASON_LABELS = {
  damage: 'Damage',
  expiry: 'Expiry',
  count_correction: 'Count correction',
  gift_sample: 'Gift / sample',
  theft_loss: 'Theft / loss',
  return_in: 'Return in',
  other: 'Other',
} as const;

export const PURCHASE_PAYMENT_LABELS = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
} as const;

export const PURCHASE_STOCK_LABELS = {
  pending: 'Pending',
  received: 'Received',
  partial: 'Partial',
} as const;
