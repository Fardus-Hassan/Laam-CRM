import { z } from 'zod';

export const productStatusSchema = z.enum(['active', 'inactive', 'discontinued']);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const productCategorySchema = z.enum([
  'honey',
  'dates',
  'combo',
  'gift',
  'raw_material',
  'packaging',
  'other',
]);
export type ProductCategory = z.infer<typeof productCategorySchema>;

export const stockStatusSchema = z.enum(['in_stock', 'low_stock', 'out_of_stock']);
export type StockStatus = z.infer<typeof stockStatusSchema>;

export const productVariantSchema = z.object({
  id: z.string(),
  label: z.string(),
  sku: z.string(),
  salePrice: z.number(),
  costPrice: z.number().optional(),
  stock: z.number().int().default(0),
  reorderLevel: z.number().int().default(5),
});

export type ProductVariant = z.infer<typeof productVariantSchema>;

export const inventoryProductListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  imageUrl: z.string().optional(),
  category: z.string().min(1),
  status: productStatusSchema,
  stock: z.number().int(),
  reorderLevel: z.number().int(),
  stockStatus: stockStatusSchema,
  variantCount: z.number().int(),
  salePriceMin: z.number(),
  salePriceMax: z.number(),
  costPrice: z.number().optional(),
  tags: z.array(z.string()).default([]),
  supplierName: z.string().optional(),
  lastSoldAt: z.string().optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
});

export type InventoryProductListItem = z.infer<typeof inventoryProductListItemSchema>;

export const inventoryProductDetailSchema = inventoryProductListItemSchema.extend({
  description: z.string().optional(),
  variants: z.array(productVariantSchema).default([]),
  notes: z.string().optional(),
  activities: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string().optional(),
        timestamp: z.string(),
        actorName: z.string().optional(),
      }),
    )
    .default([]),
});

export type InventoryProductDetail = z.infer<typeof inventoryProductDetailSchema>;

export const productFilterSchema = z.enum([
  'all',
  'low_stock',
  'out_of_stock',
  'active',
  'inactive',
]);
export type ProductFilter = z.infer<typeof productFilterSchema>;

export const productListQuerySchema = z.object({
  filter: productFilterSchema.optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productFilterCountSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number(),
});

export type ProductFilterCount = z.infer<typeof productFilterCountSchema>;

export const productListSummarySchema = z.object({
  count: z.number(),
  lowStockCount: z.number(),
  outOfStockCount: z.number(),
  activeCount: z.number(),
  totalStockValue: z.number(),
});

export type ProductListSummary = z.infer<typeof productListSummarySchema>;

export const productListResponseSchema = z.object({
  items: z.array(inventoryProductListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  summary: productListSummarySchema,
  filters: z.array(productFilterCountSchema),
});

export type ProductListResponse = z.infer<typeof productListResponseSchema>;

export const createProductPayloadSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().default('other'),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  status: productStatusSchema.default('active'),
  reorderLevel: z.number().int().default(5),
  variants: z.array(productVariantSchema).min(1),
  supplierName: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateProductPayload = z.infer<typeof createProductPayloadSchema>;

export const updateProductPayloadSchema = z.object({
  name: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  status: productStatusSchema.optional(),
  reorderLevel: z.number().int().optional(),
  variants: z.array(productVariantSchema).optional(),
  supplierName: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  stockAdjustment: z
    .object({
      delta: z.number().int(),
      reason: z.string(),
      /** When set, adjust this variant’s stock instead of the first variant. */
      variantId: z.string().optional(),
    })
    .optional(),
});

export type UpdateProductPayload = z.infer<typeof updateProductPayloadSchema>;

// Suppliers
export const supplierListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactPerson: z.string().optional(),
  phone: z.string(),
  email: z.string().optional(),
  address: z.string().optional(),
  balance: z.number(),
  productCount: z.number().int(),
  lastPurchaseAt: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  tags: z.array(z.string()).default([]),
});

export type SupplierListItem = z.infer<typeof supplierListItemSchema>;

export const supplierListResponseSchema = z.object({
  items: z.array(supplierListItemSchema),
  total: z.number(),
});

export type SupplierListResponse = z.infer<typeof supplierListResponseSchema>;

// Purchases
export const purchasePaymentStatusSchema = z.enum(['unpaid', 'partial', 'paid']);
export type PurchasePaymentStatus = z.infer<typeof purchasePaymentStatusSchema>;

export const purchaseStockStatusSchema = z.enum(['pending', 'received', 'partial']);
export type PurchaseStockStatus = z.infer<typeof purchaseStockStatusSchema>;

export const purchaseListItemSchema = z.object({
  id: z.string(),
  purchaseNumber: z.string(),
  supplierName: z.string(),
  supplierId: z.string(),
  itemCount: z.number().int(),
  totalAmount: z.number(),
  paymentStatus: purchasePaymentStatusSchema,
  stockStatus: purchaseStockStatusSchema,
  purchaseDate: z.string(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export type PurchaseListItem = z.infer<typeof purchaseListItemSchema>;

export const purchaseListResponseSchema = z.object({
  items: z.array(purchaseListItemSchema),
  total: z.number(),
  summary: z.object({
    unpaidTotal: z.number(),
    pendingReceipt: z.number(),
  }),
});

export type PurchaseListResponse = z.infer<typeof purchaseListResponseSchema>;

// Purchase returns
export const purchaseReturnListItemSchema = z.object({
  id: z.string(),
  returnNumber: z.string(),
  purchaseNumber: z.string(),
  supplierName: z.string(),
  itemCount: z.number().int(),
  totalAmount: z.number(),
  status: z.enum(['pending', 'approved', 'completed']),
  returnDate: z.string(),
  reason: z.string().optional(),
});

export type PurchaseReturnListItem = z.infer<typeof purchaseReturnListItemSchema>;

export const purchaseReturnListResponseSchema = z.object({
  items: z.array(purchaseReturnListItemSchema),
  total: z.number(),
});

export type PurchaseReturnListResponse = z.infer<typeof purchaseReturnListResponseSchema>;

// Stock adjustments
export const adjustmentReasonSchema = z.enum([
  'damage',
  'expiry',
  'count_correction',
  'gift_sample',
  'theft_loss',
  'return_in',
  'other',
]);
export type AdjustmentReason = z.infer<typeof adjustmentReasonSchema>;

export const stockAdjustmentListItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  sku: z.string(),
  previousStock: z.number().int(),
  delta: z.number().int(),
  newStock: z.number().int(),
  reason: adjustmentReasonSchema,
  note: z.string().optional(),
  adjustedBy: z.string(),
  adjustedAt: z.string(),
});

export type StockAdjustmentListItem = z.infer<typeof stockAdjustmentListItemSchema>;

export const stockAdjustmentListResponseSchema = z.object({
  items: z.array(stockAdjustmentListItemSchema),
  total: z.number(),
});

export type StockAdjustmentListResponse = z.infer<typeof stockAdjustmentListResponseSchema>;

export const createAdjustmentPayloadSchema = z.object({
  productId: z.string(),
  delta: z.number().int(),
  reason: adjustmentReasonSchema,
  note: z.string().optional(),
});

export type CreateAdjustmentPayload = z.infer<typeof createAdjustmentPayloadSchema>;

// Mixer recipes
export const mixerRecipeListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  outputProductName: z.string(),
  outputSku: z.string(),
  outputQty: z.number(),
  inputCount: z.number().int(),
  inputs: z.array(
    z.object({
      productName: z.string(),
      sku: z.string(),
      quantity: z.number(),
      unit: z.string(),
    }),
  ),
  lastMixedAt: z.string().optional(),
  status: z.enum(['active', 'draft']),
});

export type MixerRecipeListItem = z.infer<typeof mixerRecipeListItemSchema>;

export const mixerRecipeListResponseSchema = z.object({
  items: z.array(mixerRecipeListItemSchema),
  total: z.number(),
});

export type MixerRecipeListResponse = z.infer<typeof mixerRecipeListResponseSchema>;

/** One raw material line in a production batch (own qty unit + cost). */
export const productionRawMaterialSchema = z.object({
  /** Optional inventory product for stock deduct. */
  productId: z.string().optional(),
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(['kg', 'g']),
  /** Line total in ৳. */
  totalCost: z.number().nonnegative(),
  /** Rate in ৳ per kg. */
  costPerKg: z.number().nonnegative(),
});

export type ProductionRawMaterial = z.infer<typeof productionRawMaterialSchema>;

/** How many units of each finished variant to make from the batch. */
export const productionOutputLineSchema = z.object({
  variantId: z.string(),
  variantLabel: z.string(),
  /** Finished weight of this variant in grams (500 for 500g, 1000 for 1kg). */
  gramsPerUnit: z.number().positive(),
  units: z.number().int().nonnegative(),
});

export type ProductionOutputLine = z.infer<typeof productionOutputLineSchema>;

/** Per finished unit: how much of one raw material was used. */
export const productionRawUsageSchema = z.object({
  name: z.string(),
  unit: z.enum(['kg', 'g']),
  quantityPerUnit: z.number(),
  costPerUnit: z.number(),
});

export type ProductionRawUsage = z.infer<typeof productionRawUsageSchema>;

export const runProductionBatchPayloadSchema = z.object({
  outputProductId: z.string(),
  /** Multiple raw materials (Kalojira, Honey, Jafran, …). */
  rawMaterials: z.array(productionRawMaterialSchema).min(1),
  /** Per-variant output plan (e.g. 20×500g + 10×1kg). */
  outputs: z.array(productionOutputLineSchema).min(1),
  note: z.string().optional(),
});

export type RunProductionBatchPayload = z.infer<typeof runProductionBatchPayloadSchema>;

export const productionBatchResultSchema = z.object({
  id: z.string(),
  batchNumber: z.string(),
  outputProductId: z.string(),
  outputProductName: z.string(),
  outputSku: z.string(),
  unitsProduced: z.number().int(),
  /** Sum of all raw line costs. */
  materialCost: z.number(),
  /** Average cost per finished unit. */
  costPerUnit: z.number(),
  /** Each raw material — separate qty (own unit), rate, line cost. */
  inputs: z.array(
    z.object({
      productId: z.string().optional(),
      name: z.string(),
      sku: z.string().optional(),
      quantity: z.number(),
      unit: z.enum(['kg', 'g']),
      totalCost: z.number(),
      costPerKg: z.number(),
      usedUnits: z.number().optional(),
    }),
  ),
  /** Variants made + cost share + per-unit raw usage for that variant. */
  outputs: z.array(
    z.object({
      variantId: z.string(),
      variantLabel: z.string(),
      gramsPerUnit: z.number(),
      units: z.number().int(),
      cost: z.number(),
      costPerUnit: z.number(),
      rawUsage: z.array(productionRawUsageSchema),
    }),
  ),
  /** Average finished unit: each raw qty + cost. */
  perUnitRawUsage: z.array(productionRawUsageSchema),
  note: z.string().optional(),
  createdAt: z.string(),
});

export type ProductionBatchResult = z.infer<typeof productionBatchResultSchema>;

export const productionBatchListResponseSchema = z.object({
  items: z.array(productionBatchResultSchema),
  total: z.number(),
});

export type ProductionBatchListResponse = z.infer<typeof productionBatchListResponseSchema>;
