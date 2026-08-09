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
  barcode: z.string().optional(),
  baseUomId: z.string().optional(),
  baseUomCode: z.string().optional(),
  baseUomName: z.string().optional(),
  salePrice: z.number(),
  costPrice: z.number().optional(),
  stock: z.number().int().default(0),
  /** On-hand in default warehouse (sellable for orders/courier). */
  warehouseStock: z.number().int().nonnegative().optional(),
  /** Per-warehouse breakdown when loaded on product detail. */
  stockByWarehouse: z
    .array(
      z.object({
        warehouseId: z.string(),
        warehouseName: z.string(),
        quantity: z.number().int(),
      }),
    )
    .optional(),
  reorderLevel: z.number().int().default(5),
  /** Shipping weight per unit in kilograms (courier booking). Defaults to 0.5 when omitted. */
  weightKg: z.number().nonnegative().optional(),
});

export type ProductVariant = z.infer<typeof productVariantSchema>;

/** Variant payload for create/update: enforces non-negative price & stock. */
export const productVariantInputSchema = productVariantSchema.extend({
  label: z.string().min(1).max(120),
  sku: z.string().min(1).max(120),
  barcode: z.string().max(64).optional(),
  baseUomId: z.string().optional(),
  baseUomCode: z.string().max(32).optional(),
  salePrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().default(0),
  reorderLevel: z.number().int().nonnegative().default(5),
  weightKg: z.number().nonnegative().optional(),
});

export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;

export const inventoryProductListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  imageUrl: z.string().optional(),
  /** Storage key of the uploaded image (server-side reference). */
  imageKey: z.string().optional(),
  /** Category slug for filters/display (legacy + API). */
  category: z.string().min(1),
  categoryId: z.string().optional(),
  categoryLabel: z.string().optional(),
  brandId: z.string().optional(),
  brandName: z.string().optional(),
  status: productStatusSchema,
  stock: z.number().int(),
  reorderLevel: z.number().int(),
  stockStatus: stockStatusSchema,
  variantCount: z.number().int(),
  primaryVariantId: z.string().optional(),
  /** Base unit of the first variant (for purchase/production defaults). */
  primaryBaseUomCode: z.string().optional(),
  salePriceMin: z.number(),
  salePriceMax: z.number(),
  costPrice: z.number().optional(),
  tags: z.array(z.string()).default([]),
  supplierName: z.string().optional(),
  lastSoldAt: z.string().optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
  /** Present when the product is soft-deleted. */
  deletedAt: z.string().optional(),
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

export const productActivityItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  timestamp: z.string(),
  actorName: z.string().optional(),
});

export type ProductActivityItem = z.infer<typeof productActivityItemSchema>;

export const productActivityListResponseSchema = z.object({
  items: z.array(productActivityItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type ProductActivityListResponse = z.infer<typeof productActivityListResponseSchema>;

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
  brandId: z.string().optional(),
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

/**
 * Product image URL: absolute http(s) URL or an app-relative upload path.
 * Inline `data:` URIs are rejected — images must be uploaded first.
 */
export const productImageUrlSchema = z
  .string()
  .url()
  .or(z.string().startsWith('/api/uploads'))
  .refine((value) => !value.startsWith('data:'), {
    message: 'Inline data: URLs are not allowed; upload the image instead',
  });

export const createProductPayloadSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(120),
  /** @deprecated Prefer categoryId; kept for mock / older clients. */
  category: z.string().max(120).optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  description: z.string().max(5000).optional(),
  imageUrl: productImageUrlSchema.optional(),
  imageKey: z.string().max(500).optional(),
  status: productStatusSchema.default('active'),
  reorderLevel: z.number().int().nonnegative().default(5),
  variants: z.array(productVariantInputSchema).min(1),
  supplierName: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(60)).optional(),
});

export type CreateProductPayload = z.infer<typeof createProductPayloadSchema>;

export const updateProductPayloadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  sku: z.string().min(1).max(120).optional(),
  category: z.string().max(120).optional(),
  categoryId: z.string().nullable().optional(),
  brandId: z.string().nullable().optional(),
  description: z.string().max(5000).optional(),
  imageUrl: productImageUrlSchema.optional(),
  imageKey: z.string().max(500).optional(),
  status: productStatusSchema.optional(),
  reorderLevel: z.number().int().nonnegative().optional(),
  variants: z.array(productVariantInputSchema).optional(),
  supplierName: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(60)).optional(),
  /**
   * @deprecated Use the dedicated stock adjustment endpoint (adjustStockPayloadSchema).
   * Kept for backward compatibility; omitted variantId targets the first variant.
   */
  stockAdjustment: z
    .object({
      delta: z.number().int(),
      reason: z.string(),
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
  page: z.number().int().optional(),
  pageSize: z.number().int().optional(),
});

export type SupplierListResponse = z.infer<typeof supplierListResponseSchema>;

export const createSupplierPayloadSchema = z.object({
  name: z.string().min(1).max(200),
  contactPerson: z.string().max(200).optional(),
  phone: z.string().min(1).max(40),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  tags: z.array(z.string().max(40)).max(20).optional(),
});

export type CreateSupplierPayload = z.infer<typeof createSupplierPayloadSchema>;

export const updateSupplierPayloadSchema = createSupplierPayloadSchema.partial();

export type UpdateSupplierPayload = z.infer<typeof updateSupplierPayloadSchema>;

// Purchases
export const purchasePaymentStatusSchema = z.enum(['unpaid', 'partial', 'paid']);
export type PurchasePaymentStatus = z.infer<typeof purchasePaymentStatusSchema>;

export const purchaseStockStatusSchema = z.enum(['pending', 'received', 'partial', 'cancelled']);
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
  page: z.number().int().optional(),
  pageSize: z.number().int().optional(),
  summary: z.object({
    unpaidTotal: z.number(),
    pendingReceipt: z.number(),
  }),
});

export type PurchaseListResponse = z.infer<typeof purchaseListResponseSchema>;

export const purchaseDetailLineSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  variantId: z.string(),
  variantLabel: z.string(),
  variantSku: z.string(),
  quantity: z.number().int(),
  receivedQuantity: z.number().int(),
  remainingQuantity: z.number().int(),
  unitCost: z.number(),
  lineTotal: z.number(),
});

export type PurchaseDetailLine = z.infer<typeof purchaseDetailLineSchema>;

export const purchaseDetailSchema = purchaseListItemSchema.extend({
  receivedAt: z.string().optional(),
  receivedByName: z.string().optional(),
  lines: z.array(purchaseDetailLineSchema),
});

export type PurchaseDetail = z.infer<typeof purchaseDetailSchema>;

export const updatePurchasePaymentPayloadSchema = z.object({
  paymentStatus: purchasePaymentStatusSchema,
});

export type UpdatePurchasePaymentPayload = z.infer<typeof updatePurchasePaymentPayloadSchema>;

export const createPurchasePayloadSchema = z.object({
  supplierId: z.string().min(1),
  purchaseNumber: z.string().min(1).max(64),
  paymentStatus: purchasePaymentStatusSchema.default('unpaid'),
  purchaseDate: z.string(),
  dueDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1),
        quantity: z.number().positive(),
        unitCost: z.number().nonnegative(),
        uomId: z.string().optional(),
        uomCode: z.string().max(32).optional(),
      }),
    )
    .min(1)
    .max(100),
});

export type CreatePurchasePayload = z.infer<typeof createPurchasePayloadSchema>;

/** Edit header + replace lines while stockStatus is still `pending` (nothing received). */
export const updatePurchasePayloadSchema = z.object({
  supplierId: z.string().min(1).optional(),
  purchaseNumber: z.string().min(1).max(64).optional(),
  paymentStatus: purchasePaymentStatusSchema.optional(),
  purchaseDate: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1),
        quantity: z.number().positive(),
        unitCost: z.number().nonnegative(),
        uomId: z.string().optional(),
        uomCode: z.string().max(32).optional(),
      }),
    )
    .min(1)
    .max(100)
    .optional(),
});

export type UpdatePurchasePayload = z.infer<typeof updatePurchasePayloadSchema>;

export const receivePurchaseLinePayloadSchema = z.object({
  lineId: z.string().min(1),
  quantity: z.number().int().positive(),
  expiresAt: z.string().optional(),
});

export const receivePurchasePayloadSchema = z.object({
  warehouseId: z.string().min(1).optional(),
  /** When omitted, receive all remaining qty on every line. */
  lines: z.array(receivePurchaseLinePayloadSchema).min(1).max(100).optional(),
});

export type ReceivePurchasePayload = z.infer<typeof receivePurchasePayloadSchema>;

// Purchase returns
export const purchaseReturnListItemSchema = z.object({
  id: z.string(),
  returnNumber: z.string(),
  purchaseNumber: z.string(),
  supplierName: z.string(),
  itemCount: z.number().int(),
  totalAmount: z.number(),
  status: z.enum(['pending', 'approved', 'completed', 'rejected']),
  returnDate: z.string(),
  reason: z.string().optional(),
});

export type PurchaseReturnListItem = z.infer<typeof purchaseReturnListItemSchema>;

export const purchaseReturnListResponseSchema = z.object({
  items: z.array(purchaseReturnListItemSchema),
  total: z.number(),
  page: z.number().int().optional(),
  pageSize: z.number().int().optional(),
});

export type PurchaseReturnListResponse = z.infer<typeof purchaseReturnListResponseSchema>;

export const createPurchaseReturnPayloadSchema = z.object({
  returnNumber: z.string().min(1).max(64),
  purchaseId: z.string().optional(),
  purchaseNumber: z.string().min(1).max(64),
  supplierName: z.string().min(1).max(200),
  returnDate: z.string(),
  reason: z.string().max(500).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1),
        quantity: z.number().positive(),
        unitCost: z.number().nonnegative(),
        uomId: z.string().optional(),
        uomCode: z.string().max(32).optional(),
      }),
    )
    .min(1)
    .max(100),
});

export type CreatePurchaseReturnPayload = z.infer<typeof createPurchaseReturnPayloadSchema>;

export const purchaseReturnDetailLineSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  variantId: z.string(),
  variantLabel: z.string(),
  variantSku: z.string(),
  quantity: z.number().int(),
  unitCost: z.number(),
  lineTotal: z.number(),
});

export type PurchaseReturnDetailLine = z.infer<typeof purchaseReturnDetailLineSchema>;

export const purchaseReturnDetailSchema = purchaseReturnListItemSchema.extend({
  purchaseId: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  lines: z.array(purchaseReturnDetailLineSchema),
});

export type PurchaseReturnDetail = z.infer<typeof purchaseReturnDetailSchema>;

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
  page: z.number().int().optional(),
  pageSize: z.number().int().optional(),
});

export type StockAdjustmentListResponse = z.infer<typeof stockAdjustmentListResponseSchema>;

export const createAdjustmentPayloadSchema = z.object({
  productId: z.string(),
  delta: z.number(),
  reason: adjustmentReasonSchema,
  note: z.string().optional(),
  variantId: z.string().optional(),
  uomId: z.string().optional(),
  uomCode: z.string().max(32).optional(),
});

export type CreateAdjustmentPayload = z.infer<typeof createAdjustmentPayloadSchema>;

// Mixer recipes
export const mixerRecipeListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  outputProductId: z.string(),
  outputProductName: z.string(),
  outputSku: z.string(),
  outputQty: z.number(),
  inputCount: z.number().int(),
  inputs: z.array(
    z.object({
      productId: z.string().optional(),
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
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

export type MixerRecipeListResponse = z.infer<typeof mixerRecipeListResponseSchema>;

export const mixerRecipeInputSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(32),
  uomId: z.string().optional(),
});

export type MixerRecipeInput = z.infer<typeof mixerRecipeInputSchema>;

export const createMixerRecipePayloadSchema = z.object({
  name: z.string().min(1).max(200),
  outputProductId: z.string().min(1),
  outputQty: z.number().int().positive(),
  status: z.enum(['active', 'draft']).default('draft'),
  inputs: z.array(mixerRecipeInputSchema).min(1).max(50),
});

export type CreateMixerRecipePayload = z.infer<typeof createMixerRecipePayloadSchema>;

export const updateMixerRecipePayloadSchema = createMixerRecipePayloadSchema.partial();

export type UpdateMixerRecipePayload = z.infer<typeof updateMixerRecipePayloadSchema>;

/** One raw material line in a production batch (own qty unit + cost). */
export const productionRawMaterialSchema = z.object({
  /** Linked inventory product — required for stock deduction. */
  productId: z.string().min(1),
  /** Prefer this variant; otherwise server picks best-stocked in warehouse. */
  variantId: z.string().optional(),
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(32),
  uomId: z.string().optional(),
  /** Line total in ৳. */
  totalCost: z.number().nonnegative(),
  /** Rate in ৳ per selected unit (legacy field name costPerKg). */
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
  unit: z.string().min(1).max(32),
  quantityPerUnit: z.number(),
  costPerUnit: z.number(),
});

export type ProductionRawUsage = z.infer<typeof productionRawUsageSchema>;

export const runProductionBatchPayloadSchema = z.object({
  outputProductId: z.string().min(1),
  /** When set, run is tied to this recipe (lastMixedAt + audit). */
  recipeId: z.string().optional(),
  /** Warehouse to consume from / receive into. Omit = org default. */
  warehouseId: z.string().optional(),
  /** Multiple raw materials (must be linked products). */
  rawMaterials: z.array(productionRawMaterialSchema).min(1).max(50),
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
  recipeId: z.string().optional(),
  warehouseId: z.string().optional(),
  unitsProduced: z.number().int(),
  /** Sum of all raw line costs. */
  materialCost: z.number(),
  /** Average cost per finished unit. */
  costPerUnit: z.number(),
  /** Each raw material — separate qty (own unit), rate, line cost. */
  inputs: z.array(
    z.object({
      productId: z.string().optional(),
      variantId: z.string().optional(),
      name: z.string(),
      sku: z.string().optional(),
      quantity: z.number(),
      unit: z.string().min(1).max(32),
      uomId: z.string().optional(),
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
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

export type ProductionBatchListResponse = z.infer<typeof productionBatchListResponseSchema>;

export const productionPreviewResultSchema = z.object({
  unitsProduced: z.number().int(),
  materialCost: z.number(),
  costPerUnit: z.number(),
  limitedBy: z.string(),
  ok: z.boolean(),
  inputs: z.array(
    z.object({
      productId: z.string().optional(),
      variantId: z.string().optional(),
      name: z.string(),
      sku: z.string().optional(),
      quantity: z.number(),
      unit: z.string().min(1).max(32),
      uomId: z.string().optional(),
      totalCost: z.number(),
      costPerKg: z.number(),
      usedUnits: z.number().optional(),
    }),
  ),
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
  perUnitRawUsage: z.array(productionRawUsageSchema),
});

export type ProductionPreviewResult = z.infer<typeof productionPreviewResultSchema>;

// Inventory reports dashboard
export const inventoryReportLowStockItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  variantId: z.string(),
  sku: z.string(),
  variantLabel: z.string(),
  stock: z.number().int(),
  reorderLevel: z.number().int(),
  status: z.enum(['low_stock', 'out_of_stock']),
  unitCost: z.number().optional(),
  stockValueAtCost: z.number(),
});

export type InventoryReportLowStockItem = z.infer<typeof inventoryReportLowStockItemSchema>;

export const inventoryReportPurchaseItemSchema = z.object({
  id: z.string(),
  purchaseNumber: z.string(),
  supplierName: z.string(),
  stockStatus: z.string(),
  paymentStatus: z.string(),
  itemCount: z.number().int(),
  totalAmount: z.number(),
  occurredAt: z.string(),
});

export type InventoryReportPurchaseItem = z.infer<typeof inventoryReportPurchaseItemSchema>;

export const inventoryReportReturnItemSchema = z.object({
  id: z.string(),
  returnNumber: z.string(),
  supplierName: z.string(),
  status: z.string(),
  itemCount: z.number().int(),
  totalAmount: z.number(),
  occurredAt: z.string(),
});

export type InventoryReportReturnItem = z.infer<typeof inventoryReportReturnItemSchema>;

export const inventoryReportProductionItemSchema = z.object({
  id: z.string(),
  batchNumber: z.string(),
  productId: z.string(),
  productName: z.string(),
  unitsProduced: z.number(),
  materialCost: z.number(),
  occurredAt: z.string(),
});

export type InventoryReportProductionItem = z.infer<typeof inventoryReportProductionItemSchema>;

export const inventoryReportMovementItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  variantId: z.string(),
  variantLabel: z.string(),
  variantSku: z.string(),
  delta: z.number().int(),
  previousStock: z.number().int(),
  newStock: z.number().int(),
  reason: z.string(),
  note: z.string().optional(),
  actorName: z.string().optional(),
  occurredAt: z.string(),
});

export type InventoryReportMovementItem = z.infer<typeof inventoryReportMovementItemSchema>;

export const inventoryReportBreakdownItemSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  units: z.number().int(),
  valueAtCost: z.number(),
});

export type InventoryReportBreakdownItem = z.infer<typeof inventoryReportBreakdownItemSchema>;

export const inventoryReportsQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type InventoryReportsQuery = z.infer<typeof inventoryReportsQuerySchema>;

export const inventoryReportsResponseSchema = z.object({
  generatedAt: z.string(),
  period: z
    .object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    })
    .optional(),
  summary: z.object({
    skuCount: z.number().int(),
    totalStockUnits: z.number().int(),
    inventoryValuationAtCost: z.number(),
    uncostedSkuCount: z.number().int(),
    lowStockCount: z.number().int(),
    pendingPurchases: z.number().int(),
    pendingReturns: z.number().int(),
  }),
  lowStock: z.array(inventoryReportLowStockItemSchema),
  recent: z.object({
    purchases: z.array(inventoryReportPurchaseItemSchema),
    returns: z.array(inventoryReportReturnItemSchema),
    production: z.array(inventoryReportProductionItemSchema),
    movements: z.array(inventoryReportMovementItemSchema),
  }),
  valuationBreakdown: z.object({
    categories: z.array(inventoryReportBreakdownItemSchema),
    brands: z.array(inventoryReportBreakdownItemSchema),
  }),
  expiringLots: z
    .array(
      z.object({
        id: z.string(),
        lotNumber: z.string(),
        productName: z.string().optional(),
        variantSku: z.string().optional(),
        quantity: z.number().int(),
        expiresAt: z.string().optional(),
        daysToExpiry: z.number().int().optional(),
        warehouseName: z.string().optional(),
      }),
    )
    .optional(),
});

export type InventoryReportsResponse = z.infer<typeof inventoryReportsResponseSchema>;
