import { z } from 'zod';

/** A single stock movement (audit trail entry) for a product variant. */
export const stockMovementSchema = z.object({
  id: z.string(),
  organizationId: z.string().optional(),
  productId: z.string(),
  productName: z.string().optional(),
  productSku: z.string().optional(),
  variantId: z.string(),
  variantLabel: z.string().optional(),
  variantSku: z.string().optional(),
  warehouseId: z.string().optional(),
  warehouseName: z.string().optional(),
  lotId: z.string().optional(),
  lotNumber: z.string().optional(),
  delta: z.number().int(),
  previousStock: z.number().int(),
  newStock: z.number().int(),
  unitCost: z.number().optional(),
  valueDelta: z.number().optional(),
  reason: z.string(),
  note: z.string().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
  actorUserId: z.string().optional(),
  actorName: z.string().optional(),
  createdAt: z.string(),
});

export type StockMovement = z.infer<typeof stockMovementSchema>;

export const stockMovementListResponseSchema = z.object({
  items: z.array(stockMovementSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type StockMovementListResponse = z.infer<typeof stockMovementListResponseSchema>;

export const stockMovementListQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  warehouseId: z.string().optional(),
  reason: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  direction: z.enum(['in', 'out']).optional(),
});

export type StockMovementListQuery = z.infer<typeof stockMovementListQuerySchema>;

/** Payload for the dedicated per-variant stock adjustment endpoint. */
export const adjustStockPayloadSchema = z.object({
  variantId: z.string().min(1),
  delta: z
    .number()
    .int()
    .refine((value) => value !== 0, { message: 'Delta must not be 0' }),
  reason: z.string().min(1).max(200),
  note: z.string().max(2000).optional(),
  warehouseId: z.string().optional(),
  lotNumber: z.string().max(64).optional(),
  expiresAt: z.string().optional(),
});

export type AdjustStockPayload = z.infer<typeof adjustStockPayloadSchema>;

// Warehouses
export const warehouseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  address: z.string().optional(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  skuCount: z.number().int().optional(),
  totalUnits: z.number().int().optional(),
});

export type Warehouse = z.infer<typeof warehouseSchema>;

export const warehouseListResponseSchema = z.object({
  items: z.array(warehouseSchema),
  total: z.number(),
});

export type WarehouseListResponse = z.infer<typeof warehouseListResponseSchema>;

export const createWarehousePayloadSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  address: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

export type CreateWarehousePayload = z.infer<typeof createWarehousePayloadSchema>;

export const updateWarehousePayloadSchema = createWarehousePayloadSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateWarehousePayload = z.infer<typeof updateWarehousePayloadSchema>;

export const transferStockPayloadSchema = z.object({
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().positive(),
  uomId: z.string().optional(),
  uomCode: z.string().max(32).optional(),
  note: z.string().max(500).optional(),
});

export type TransferStockPayload = z.infer<typeof transferStockPayloadSchema>;

// Lots / expiry
export const inventoryLotSchema = z.object({
  id: z.string(),
  variantId: z.string(),
  productId: z.string().optional(),
  productName: z.string().optional(),
  variantLabel: z.string().optional(),
  variantSku: z.string().optional(),
  warehouseId: z.string().optional(),
  warehouseName: z.string().optional(),
  lotNumber: z.string(),
  barcode: z.string().optional(),
  manufacturedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  receivedAt: z.string(),
  quantity: z.number().int(),
  unitCost: z.number().optional(),
  status: z.string(),
  daysToExpiry: z.number().int().optional(),
});

export type InventoryLot = z.infer<typeof inventoryLotSchema>;

export const inventoryLotListResponseSchema = z.object({
  items: z.array(inventoryLotSchema),
  total: z.number(),
});

export type InventoryLotListResponse = z.infer<typeof inventoryLotListResponseSchema>;

// Accounting reconciliation
export const inventoryReconciliationResponseSchema = z.object({
  generatedAt: z.string(),
  inventoryValuationAtCost: z.number(),
  inventoryGlBalance: z.number(),
  difference: z.number(),
  isBalanced: z.boolean(),
  accounts: z.array(
    z.object({
      accountCode: z.string(),
      accountName: z.string(),
      debit: z.number(),
      credit: z.number(),
      balance: z.number(),
    }),
  ),
  recentJournals: z.array(
    z.object({
      id: z.string(),
      entryDate: z.string(),
      description: z.string(),
      reference: z.string().optional(),
      sourceType: z.string(),
      sourceId: z.string(),
      amount: z.number(),
    }),
  ),
  expiringLots: z.array(inventoryLotSchema),
});

export type InventoryReconciliationResponse = z.infer<
  typeof inventoryReconciliationResponseSchema
>;
