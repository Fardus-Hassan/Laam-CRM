export type ProductBulkActionId =
  | 'set_status'
  | 'set_category'
  | 'adjust_stock'
  | 'export';

export type ProductBulkActionDefinition = {
  id: ProductBulkActionId;
  label: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  requiresSelection?: boolean;
};

export const PRODUCT_BULK_ACTIONS: ProductBulkActionDefinition[] = [
  { id: 'set_status', label: 'Set status', requiresSelection: true, variant: 'outline' },
  { id: 'set_category', label: 'Set category', requiresSelection: true, variant: 'outline' },
  { id: 'adjust_stock', label: 'Adjust stock', requiresSelection: true, variant: 'secondary' },
  { id: 'export', label: 'Export', requiresSelection: true, variant: 'outline' },
];
