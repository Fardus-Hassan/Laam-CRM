import type {
  CreateAdjustmentPayload,
  CreateProductPayload,
  InventoryProductDetail,
  InventoryProductListItem,
  MixerRecipeListItem,
  ProductCategory,
  ProductFilterCount,
  ProductListQuery,
  ProductListResponse,
  ProductionBatchResult,
  PurchaseListItem,
  PurchaseReturnListItem,
  RunProductionBatchPayload,
  StockAdjustmentListItem,
  SupplierListItem,
  UpdateProductPayload,
} from '@laam/types';

import {
  postInventoryProduction,
  postInventoryPurchase,
  postInventoryWriteOff,
} from '@/features/accounting/data/mock-accounting';

import { MOCK_PRODUCTS } from '@/features/orders/data/mock-products';
import { PRODUCT_FILTERS } from '@/features/inventory/config/product-filters';

const SUPPLIER_NAMES = [
  'Sundarban Honey Co-op',
  'Rajshahi Khejur Traders',
  'Dhaka Packaging House',
  'Modhu Valley Suppliers',
  'Chittagong Dates Import',
];

function categoryForSku(sku: string): ProductCategory {
  if (sku.startsWith('HKM') || sku.startsWith('MDH') || sku.startsWith('RAW-HNY')) return 'honey';
  if (sku.startsWith('KLJ') || sku.startsWith('KLM')) return 'other';
  if (sku.startsWith('PNK') || sku.startsWith('BTR') || sku.startsWith('MRG')) return 'other';
  if (sku.startsWith('WLS') || sku.startsWith('RMD') || sku.startsWith('CMB')) return 'gift';
  if (sku.startsWith('KHJ') || sku.startsWith('AJW') || sku.startsWith('DKJ')) return 'dates';
  return 'other';
}

function stockStatus(stock: number, reorder: number): InventoryProductListItem['stockStatus'] {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= reorder) return 'low_stock';
  return 'in_stock';
}

function buildProduct(index: number): InventoryProductDetail {
  const base = MOCK_PRODUCTS[index % MOCK_PRODUCTS.length];
  // Keep healthy stock so production batches (kg → jars) work in the demo
  const stock = index % 9 === 0 ? 0 : index % 5 === 0 ? 8 : 40 + (index % 60);
  const reorder = index % 4 === 0 ? 10 : 5;
  const costFactor = 0.55 + (index % 3) * 0.05;
  const variants = base.variations.map((v, vi) => ({
    id: `${base.id}-v${vi + 1}`,
    label: v.label,
    sku: `${base.sku}-${v.label.slice(0, 3).toUpperCase()}`,
    salePrice: v.unitPrice,
    costPrice: Math.round(v.unitPrice * costFactor),
    stock: Math.max(0, stock - vi * 2),
    reorderLevel: reorder,
  }));
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const prices = variants.map((v) => v.salePrice);
  const day = 15 + (index % 14);
  const createdAt = `2026-05-${String(day).padStart(2, '0')}T10:00:00.000Z`;
  const updatedAt = `2026-06-${String(20 + (index % 8)).padStart(2, '0')}T14:30:00.000Z`;

  const listItem: InventoryProductListItem = {
    id: base.id,
    name: base.name,
    sku: base.sku,
    imageUrl: base.imageUrl,
    category: categoryForSku(base.sku),
    status: index % 11 === 0 ? 'inactive' : 'active',
    stock: totalStock,
    reorderLevel: reorder,
    stockStatus: stockStatus(totalStock, reorder),
    variantCount: variants.length,
    salePriceMin: Math.min(...prices),
    salePriceMax: Math.max(...prices),
    costPrice: variants[0].costPrice,
    tags: base.isHero
      ? ['Hero', 'Best seller']
      : base.isUpsell
        ? ['Upsell']
        : index % 3 === 0
          ? ['Campaign']
          : [],
    supplierName: SUPPLIER_NAMES[index % SUPPLIER_NAMES.length],
    lastSoldAt: index % 2 === 0 ? `2026-07-0${1 + (index % 2)}T11:00:00.000Z` : undefined,
    updatedAt,
    createdAt,
  };

  return {
    ...listItem,
    description:
      index % 2 === 0
        ? 'Popular with repeat buyers. Keep gift packaging in stock during Ramadan.'
        : undefined,
    variants,
    notes: index % 6 === 0 ? 'Shelf life 12 months. Store in cool dry place.' : undefined,
    activities: [
      {
        id: `${base.id}-a1`,
        label: 'Product created',
        timestamp: createdAt,
        actorName: 'Sakib Ahmed',
      },
      ...(totalStock <= reorder
        ? [
            {
              id: `${base.id}-a2`,
              label: 'Low stock alert',
              timestamp: updatedAt,
              actorName: 'System',
            },
          ]
        : []),
    ],
  };
}

export const MOCK_INVENTORY_PRODUCTS: InventoryProductDetail[] = MOCK_PRODUCTS.map((_, i) =>
  buildProduct(i),
);

export function getMockProductById(id: string): InventoryProductDetail | undefined {
  return MOCK_INVENTORY_PRODUCTS.find((p) => p.id === id);
}

export function getLowStockCount(): number {
  return MOCK_INVENTORY_PRODUCTS.filter(
    (p) => p.stockStatus === 'low_stock' || p.stockStatus === 'out_of_stock',
  ).length;
}

function isLowStock(p: InventoryProductListItem) {
  return p.stockStatus === 'low_stock';
}

function isOutOfStock(p: InventoryProductListItem) {
  return p.stockStatus === 'out_of_stock';
}

function computeFilters(all: InventoryProductListItem[]): ProductFilterCount[] {
  return PRODUCT_FILTERS.map((f) => {
    let count = all.length;
    if (f.id === 'low_stock') count = all.filter(isLowStock).length;
    if (f.id === 'out_of_stock') count = all.filter(isOutOfStock).length;
    if (f.id === 'active') count = all.filter((p) => p.status === 'active').length;
    if (f.id === 'inactive') count = all.filter((p) => p.status !== 'active').length;
    return { id: f.id, label: f.label, count };
  });
}

export function filterMockProducts(query: ProductListQuery): ProductListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';

  const allMatching = MOCK_INVENTORY_PRODUCTS.filter((item) => {
    if (query.category && item.category !== query.category) return false;
    if (query.filter === 'low_stock' && !isLowStock(item)) return false;
    if (query.filter === 'out_of_stock' && !isOutOfStock(item)) return false;
    if (query.filter === 'active' && item.status !== 'active') return false;
    if (query.filter === 'inactive' && item.status === 'active') return false;

    if (!search) return true;
    return (
      item.name.toLowerCase().includes(search) ||
      item.sku.toLowerCase().includes(search) ||
      (item.supplierName?.toLowerCase().includes(search) ?? false) ||
      item.tags.some((t) => t.toLowerCase().includes(search))
    );
  });

  const listItems = allMatching.map(({ activities: _a, variants: _v, notes: _n, description: _d, ...li }) => li);
  const total = listItems.length;
  const start = (query.page - 1) * query.pageSize;
  const pageItems = listItems.slice(start, start + query.pageSize);

  const stockValue = listItems.reduce(
    (sum, p) => sum + p.stock * (p.costPrice ?? p.salePriceMin * 0.6),
    0,
  );

  return {
    items: pageItems,
    total,
    page: query.page,
    pageSize: query.pageSize,
    summary: {
      count: total,
      lowStockCount: listItems.filter(isLowStock).length,
      outOfStockCount: listItems.filter(isOutOfStock).length,
      activeCount: listItems.filter((p) => p.status === 'active').length,
      totalStockValue: Math.round(stockValue),
    },
    filters: computeFilters(
      MOCK_INVENTORY_PRODUCTS.map(({ activities: _a, variants: _v, notes: _n, description: _d, ...li }) => li),
    ),
  };
}

export function createMockProduct(payload: CreateProductPayload): InventoryProductDetail {
  const id = `prod-${MOCK_INVENTORY_PRODUCTS.length + 1}`;
  const now = new Date().toISOString();
  const stock = payload.variants.reduce((s, v) => s + v.stock, 0);
  const prices = payload.variants.map((v) => v.salePrice);
  const reorder = payload.reorderLevel ?? 5;

  const product: InventoryProductDetail = {
    id,
    name: payload.name,
    sku: payload.sku,
    imageUrl: payload.imageUrl,
    category: payload.category,
    status: payload.status,
    stock,
    reorderLevel: reorder,
    stockStatus: stockStatus(stock, reorder),
    variantCount: payload.variants.length,
    salePriceMin: Math.min(...prices),
    salePriceMax: Math.max(...prices),
    costPrice: payload.variants[0]?.costPrice,
    tags: payload.tags ?? [],
    supplierName: payload.supplierName,
    updatedAt: now,
    createdAt: now,
    description: payload.description,
    variants: payload.variants,
    notes: payload.notes,
    activities: [
      { id: `${id}-a1`, label: 'Product created', timestamp: now, actorName: 'Sakib Ahmed' },
    ],
  };
  MOCK_INVENTORY_PRODUCTS.unshift(product);
  return product;
}

/** Decrease (or increase if quantity negative) stock by product name / sku match. */
export function decreaseStockForOrderLines(
  lines: { productName: string; sku?: string; quantity: number }[],
): void {
  for (const line of lines) {
    const product = MOCK_INVENTORY_PRODUCTS.find(
      (p) =>
        p.name.toLowerCase() === line.productName.toLowerCase() ||
        (line.sku && p.sku?.toLowerCase() === line.sku.toLowerCase()) ||
        p.name.toLowerCase().includes(line.productName.toLowerCase().slice(0, 8)),
    );
    if (!product) continue;
    updateMockProduct(product.id, {
      stockAdjustment: {
        delta: -line.quantity,
        reason: line.quantity >= 0 ? 'Order sale' : 'Order cancel restock',
      },
    });
  }
}

export function updateMockProduct(id: string, patch: UpdateProductPayload): InventoryProductDetail | undefined {
  const index = MOCK_INVENTORY_PRODUCTS.findIndex((p) => p.id === id);
  if (index === -1) return undefined;
  const current = MOCK_INVENTORY_PRODUCTS[index];
  let variants = patch.variants ?? current.variants;
  let stock = variants.reduce((s, v) => s + v.stock, 0);

  if (patch.stockAdjustment) {
    const delta = patch.stockAdjustment.delta;
    const variantId = patch.stockAdjustment.variantId;
    variants = variants.map((v, i) => {
      const target = variantId ? v.id === variantId : i === 0;
      return target ? { ...v, stock: Math.max(0, v.stock + delta) } : v;
    });
    stock = variants.reduce((s, v) => s + v.stock, 0);
  }

  const reorder = patch.reorderLevel ?? current.reorderLevel;
  const prices = variants.map((v) => v.salePrice);
  const now = new Date().toISOString();

  const updated: InventoryProductDetail = {
    ...current,
    ...patch,
    variants,
    stock,
    reorderLevel: reorder,
    stockStatus: stockStatus(stock, reorder),
    variantCount: variants.length,
    salePriceMin: prices.length ? Math.min(...prices) : current.salePriceMin,
    salePriceMax: prices.length ? Math.max(...prices) : current.salePriceMax,
    updatedAt: now,
    activities: [
      ...current.activities,
      ...(patch.stockAdjustment
        ? [
            {
              id: `${id}-adj-${Date.now()}`,
              label: `Stock ${patch.stockAdjustment.delta > 0 ? '+' : ''}${patch.stockAdjustment.delta}`,
              description: patch.stockAdjustment.reason,
              timestamp: now,
              actorName: 'Sakib Ahmed',
            },
          ]
        : []),
    ],
  };
  MOCK_INVENTORY_PRODUCTS[index] = updated;
  return updated;
}

export function bulkUpdateMockProducts(payload: {
  productIds: string[];
  status?: InventoryProductListItem['status'];
  category?: ProductCategory;
  stockDelta?: number;
}): { successCount: number; failedCount: number } {
  let successCount = 0;
  let failedCount = 0;
  for (const id of payload.productIds) {
    const patch: UpdateProductPayload = {};
    if (payload.status) patch.status = payload.status;
    if (payload.category) patch.category = payload.category;
    if (payload.stockDelta) {
      patch.stockAdjustment = { delta: payload.stockDelta, reason: 'Bulk adjustment' };
    }
    const result = updateMockProduct(id, patch);
    if (result) successCount++;
    else failedCount++;
  }
  return { successCount, failedCount };
}

// Suppliers
export const MOCK_SUPPLIERS: SupplierListItem[] = SUPPLIER_NAMES.map((name, i) => ({
  id: `sup-${i + 1}`,
  name,
  contactPerson: ['Karim Uddin', 'Fatema Begum', 'Rahim Ali', 'Nusrat Jahan', 'Tanvir Hossain'][i],
  phone: `017${String(10000000 + i * 111111).slice(0, 8)}`,
  email: i % 2 === 0 ? `contact@${name.split(' ')[0].toLowerCase()}.com` : undefined,
  address: ['Dhaka', 'Rajshahi', 'Chittagong', 'Khulna', 'Sylhet'][i],
  balance: i % 3 === 0 ? 45000 + i * 5000 : i % 2 === 0 ? -12000 : 0,
  productCount: 2 + (i % 4),
  lastPurchaseAt: `2026-06-${String(10 + i).padStart(2, '0')}T09:00:00.000Z`,
  status: i === 4 ? 'inactive' : 'active',
  tags: i === 0 ? ['Primary'] : [],
}));

// Purchases
export const MOCK_PURCHASES: PurchaseListItem[] = Array.from({ length: 18 }, (_, i) => {
  const supplier = MOCK_SUPPLIERS[i % MOCK_SUPPLIERS.length];
  const paymentStatuses = ['unpaid', 'partial', 'paid'] as const;
  const stockStatuses = ['pending', 'received', 'partial'] as const;
  return {
    id: `pur-${i + 1}`,
    purchaseNumber: `PO-${2400 + i}`,
    supplierName: supplier.name,
    supplierId: supplier.id,
    itemCount: 2 + (i % 4),
    totalAmount: 15000 + i * 3500,
    paymentStatus: paymentStatuses[i % 3],
    stockStatus: stockStatuses[i % 3],
    purchaseDate: `2026-06-${String(5 + (i % 20)).padStart(2, '0')}`,
    dueDate: i % 3 === 0 ? `2026-07-${String(5 + (i % 10)).padStart(2, '0')}` : undefined,
    notes: i % 4 === 0 ? 'Urgent — Ramadan stock' : undefined,
  };
});

export function filterMockPurchases(search?: string) {
  const q = search?.trim().toLowerCase() ?? '';
  const items = MOCK_PURCHASES.filter(
    (p) =>
      !q ||
      p.purchaseNumber.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q),
  );
  return {
    items,
    total: items.length,
    summary: {
      unpaidTotal: items.filter((p) => p.paymentStatus !== 'paid').reduce((s, p) => s + p.totalAmount, 0),
      pendingReceipt: items.filter((p) => p.stockStatus !== 'received').length,
    },
  };
}

/** Receive PO stock once — updates PO status, stock, and accounting. */
export function receiveMockPurchase(purchaseId: string): PurchaseListItem {
  const purchase = MOCK_PURCHASES.find((p) => p.id === purchaseId);
  if (!purchase) {
    throw new Error('Purchase order not found');
  }
  if (purchase.stockStatus === 'received') {
    throw new Error(`${purchase.purchaseNumber} already received`);
  }

  // Prefer hero mix / active catalog products for stock-in
  const product =
    MOCK_INVENTORY_PRODUCTS.find((p) => p.id === 'prod-hero-mix' || p.sku.startsWith('HKM')) ??
    MOCK_INVENTORY_PRODUCTS.find((p) => p.status === 'active') ??
    MOCK_INVENTORY_PRODUCTS[0];

  if (product) {
    updateMockProduct(product.id, {
      stockAdjustment: {
        delta: purchase.itemCount || 1,
        reason: `Received ${purchase.purchaseNumber}`,
      },
    });
  }

  purchase.stockStatus = 'received';

  postInventoryPurchase({
    amount: purchase.totalAmount,
    supplierName: purchase.supplierName,
    reference: purchase.purchaseNumber,
    paymentMethod: purchase.paymentStatus === 'paid' ? 'bank' : 'cash',
    accountName: 'DBBL Current',
    paidNow: purchase.paymentStatus === 'paid',
  });

  return { ...purchase };
}

// Purchase returns
export const MOCK_PURCHASE_RETURNS: PurchaseReturnListItem[] = Array.from({ length: 8 }, (_, i) => ({
  id: `pr-${i + 1}`,
  returnNumber: `PR-${900 + i}`,
  purchaseNumber: `PO-${2400 + i}`,
  supplierName: MOCK_SUPPLIERS[i % MOCK_SUPPLIERS.length].name,
  itemCount: 1 + (i % 3),
  totalAmount: 3000 + i * 1200,
  status: (['pending', 'approved', 'completed'] as const)[i % 3],
  returnDate: `2026-06-${String(18 + i).padStart(2, '0')}`,
  reason: ['Damaged jars', 'Wrong quantity', 'Expired batch', 'Quality issue'][i % 4],
}));

// Stock adjustments
export const MOCK_ADJUSTMENTS: StockAdjustmentListItem[] = Array.from({ length: 22 }, (_, i) => {
  const product = MOCK_INVENTORY_PRODUCTS[i % MOCK_INVENTORY_PRODUCTS.length];
  const delta = i % 3 === 0 ? -2 : i % 4 === 0 ? 10 : -1;
  const prev = product.stock;
  return {
    id: `adj-${i + 1}`,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    previousStock: prev,
    delta,
    newStock: Math.max(0, prev + delta),
    reason: (['damage', 'count_correction', 'gift_sample', 'expiry', 'return_in'] as const)[i % 5],
    note: i % 3 === 0 ? 'Found during monthly count' : undefined,
    adjustedBy: ['Sakib Ahmed', 'Fatema Akter', 'Karim Hassan'][i % 3],
    adjustedAt: `2026-06-${String(1 + (i % 28)).padStart(2, '0')}T${String(9 + (i % 8)).padStart(2, '0')}:00:00.000Z`,
  };
});

export function createMockAdjustment(payload: CreateAdjustmentPayload): StockAdjustmentListItem {
  const product = getMockProductById(payload.productId);
  if (!product) throw new Error('Product not found');
  const prev = product.stock;
  updateMockProduct(payload.productId, {
    stockAdjustment: { delta: payload.delta, reason: payload.note ?? payload.reason },
  });
  const adj: StockAdjustmentListItem = {
    id: `adj-${MOCK_ADJUSTMENTS.length + 1}`,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    previousStock: prev,
    delta: payload.delta,
    newStock: Math.max(0, prev + payload.delta),
    reason: payload.reason,
    note: payload.note,
    adjustedBy: 'Sakib Ahmed',
    adjustedAt: new Date().toISOString(),
  };
  MOCK_ADJUSTMENTS.unshift(adj);

  if (payload.delta < 0 && (payload.reason === 'damage' || payload.reason === 'expiry' || payload.reason === 'theft_loss')) {
    const unitCost = product.costPrice ?? product.salePriceMin * 0.6;
    postInventoryWriteOff({
      amount: Math.abs(payload.delta) * unitCost,
      productName: product.name,
      reason: payload.reason,
      reference: adj.id,
    });
  }

  return adj;
}

export const MOCK_PRODUCTION_RUNS: ProductionBatchResult[] = [];

function qtyToKg(quantity: number, unit: 'kg' | 'g') {
  return unit === 'kg' ? quantity : quantity / 1000;
}

function qtyToGrams(quantity: number, unit: 'kg' | 'g') {
  return unit === 'kg' ? quantity * 1000 : quantity;
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

type PreviewResult = {
  unitsProduced: number;
  materialCost: number;
  costPerUnit: number;
  limitedBy: string;
  ok: boolean;
  inputs: ProductionBatchResult['inputs'];
  outputs: ProductionBatchResult['outputs'];
  perUnitRawUsage: ProductionBatchResult['perUnitRawUsage'];
};

/** Preview multi-raw production (no stock change). */
export function previewProductionBatch(payload: RunProductionBatchPayload): PreviewResult {
  const output = getMockProductById(payload.outputProductId);
  const empty: PreviewResult = {
    unitsProduced: 0,
    materialCost: 0,
    costPerUnit: 0,
    limitedBy: 'Missing product',
    ok: false,
    inputs: [],
    outputs: [],
    perUnitRawUsage: [],
  };
  if (!output) return empty;

  const raws = (payload.rawMaterials ?? []).filter((r) => r.name.trim() && r.quantity > 0);
  const lines = (payload.outputs ?? []).filter((o) => o.units > 0);
  if (!raws.length) {
    return { ...empty, limitedBy: 'Add at least one raw material' };
  }
  if (!lines.length) {
    return { ...empty, limitedBy: 'Enter units for at least one variant' };
  }

  const unitsProduced = lines.reduce((s, o) => s + o.units, 0);
  const totalFinishedGrams = lines.reduce((s, o) => s + o.units * o.gramsPerUnit, 0);

  const inputs: ProductionBatchResult['inputs'] = raws.map((r) => {
    const qtyKg = qtyToKg(r.quantity, r.unit);
    const costPerKg =
      r.costPerKg > 0 ? r.costPerKg : qtyKg > 0 ? r.totalCost / qtyKg : 0;
    const totalCost = r.totalCost > 0 ? r.totalCost : Math.round(costPerKg * qtyKg);
    const product = r.productId ? getMockProductById(r.productId) : undefined;
    const usedUnits = product
      ? r.unit === 'kg'
        ? Math.ceil(r.quantity)
        : Math.max(1, Math.ceil(r.quantity / 1000))
      : undefined;
    return {
      productId: r.productId,
      name: r.name.trim(),
      sku: product?.sku,
      quantity: r.quantity,
      unit: r.unit,
      totalCost: Math.round(totalCost),
      costPerKg: Math.round(costPerKg * 100) / 100,
      usedUnits,
    };
  });

  let limitedBy = '';
  let ok = true;
  for (const input of inputs) {
    if (!input.productId || input.usedUnits == null) continue;
    const p = getMockProductById(input.productId);
    if (p && p.stock < input.usedUnits) {
      ok = false;
      limitedBy = `${input.name} stock (need ${input.usedUnits}, have ${p.stock})`;
    }
  }

  const materialCost = inputs.reduce((s, i) => s + i.totalCost, 0);
  const costPerUnit = unitsProduced > 0 ? Math.round(materialCost / unitsProduced) : 0;

  // Average unit: each raw split evenly by unit count
  const perUnitRawUsage = inputs.map((input) => ({
    name: input.name,
    unit: input.unit,
    quantityPerUnit: unitsProduced > 0 ? round3(input.quantity / unitsProduced) : 0,
    costPerUnit: unitsProduced > 0 ? Math.round(input.totalCost / unitsProduced) : 0,
  }));

  // Per variant: allocate by finished weight share
  const outputs: ProductionBatchResult['outputs'] = lines.map((line) => {
    const lineGrams = line.units * line.gramsPerUnit;
    const share = totalFinishedGrams > 0 ? lineGrams / totalFinishedGrams : 0;
    const lineCost = Math.round(materialCost * share);
    const rawUsage = inputs.map((input) => {
      const totalRawGrams = qtyToGrams(input.quantity, input.unit);
      const gramsForThisVariantLine = totalRawGrams * share;
      const gramsPerOneUnit = line.units > 0 ? gramsForThisVariantLine / line.units : 0;
      const quantityPerUnit =
        input.unit === 'kg' ? round3(gramsPerOneUnit / 1000) : round3(gramsPerOneUnit);
      const costPerUnit =
        line.units > 0 ? Math.round((input.totalCost * share) / line.units) : 0;
      return {
        name: input.name,
        unit: input.unit,
        quantityPerUnit,
        costPerUnit,
      };
    });
    return {
      variantId: line.variantId,
      variantLabel: line.variantLabel,
      gramsPerUnit: line.gramsPerUnit,
      units: line.units,
      cost: lineCost,
      costPerUnit: line.units > 0 ? Math.round(lineCost / line.units) : 0,
      rawUsage,
    };
  });

  return {
    unitsProduced,
    materialCost,
    costPerUnit,
    limitedBy: limitedBy || 'OK',
    ok,
    inputs,
    outputs,
    perUnitRawUsage,
  };
}

export function runProductionBatch(payload: RunProductionBatchPayload): ProductionBatchResult {
  const output = getMockProductById(payload.outputProductId);
  if (!output) {
    throw new Error('Finished product not found');
  }

  const preview = previewProductionBatch(payload);
  if (!preview.ok || preview.unitsProduced <= 0) {
    throw new Error(preview.limitedBy || 'Cannot run production');
  }

  for (const input of preview.inputs) {
    if (!input.productId || !input.usedUnits) continue;
    updateMockProduct(input.productId, {
      stockAdjustment: {
        delta: -input.usedUnits,
        reason: `Production — ${input.quantity}${input.unit} ${input.name}`,
      },
    });
  }

  for (const line of preview.outputs) {
    updateMockProduct(output.id, {
      stockAdjustment: {
        delta: line.units,
        reason: `Production ${line.variantLabel} ×${line.units}`,
        variantId: line.variantId,
      },
    });
  }

  const units = preview.unitsProduced;
  const materialCost = preview.materialCost;
  const costPerUnit = preview.costPerUnit;

  const outIdx = MOCK_INVENTORY_PRODUCTS.findIndex((p) => p.id === output.id);
  if (outIdx >= 0) {
    const cur = MOCK_INVENTORY_PRODUCTS[outIdx];
    const prevStock = Math.max(0, cur.stock - units);
    const prevCost = cur.costPrice ?? costPerUnit;
    const avgCost =
      prevStock + units > 0
        ? Math.round((prevStock * prevCost + units * costPerUnit) / (prevStock + units))
        : costPerUnit;
    MOCK_INVENTORY_PRODUCTS[outIdx] = {
      ...cur,
      costPrice: avgCost,
      variants: cur.variants.map((v) => {
        const line = preview.outputs.find((o) => o.variantId === v.id);
        return line ? { ...v, costPrice: line.costPerUnit || avgCost } : v;
      }),
    };
  }

  const batchNumber = `PRD-${2400 + MOCK_PRODUCTION_RUNS.length + 1}`;
  const result: ProductionBatchResult = {
    id: `prd-${Date.now()}`,
    batchNumber,
    outputProductId: output.id,
    outputProductName: output.name,
    outputSku: output.sku,
    unitsProduced: units,
    materialCost,
    costPerUnit,
    inputs: preview.inputs,
    outputs: preview.outputs,
    perUnitRawUsage: preview.perUnitRawUsage,
    note: payload.note,
    createdAt: new Date().toISOString(),
  };

  MOCK_PRODUCTION_RUNS.unshift(result);
  postInventoryProduction({
    materialCost,
    unitsProduced: units,
    outputName: `${output.name} (${preview.inputs.map((i) => `${i.name} ${i.quantity}${i.unit}`).join(' + ')})`,
    batchNumber,
    costPerUnit,
  });

  const recipe = MOCK_MIXER_RECIPES.find((r) => r.outputSku === output.sku);
  if (recipe) recipe.lastMixedAt = result.createdAt;

  return result;
}

// Mixer recipes
export const MOCK_MIXER_RECIPES: MixerRecipeListItem[] = [
  {
    id: 'mix-1',
    name: 'Modhu + Khejur Combo — Small',
    outputProductName: 'Modhu + Khejur Combo',
    outputSku: 'CMB-01',
    outputQty: 1,
    inputCount: 2,
    inputs: [
      { productName: 'Modhu (Honey) 350ml', sku: 'MDH-350', quantity: 1, unit: 'jar' },
      { productName: 'Khejur (Dates) 500g', sku: 'KHJ-500', quantity: 1, unit: 'pack' },
    ],
    lastMixedAt: '2026-06-28T14:00:00.000Z',
    status: 'active',
  },
  {
    id: 'mix-2',
    name: 'Ramadan Gift Box — Standard',
    outputProductName: 'Ramadan Gift Box',
    outputSku: 'RMD-GFT',
    outputQty: 1,
    inputCount: 4,
    inputs: [
      { productName: 'Ajwa Khejur 500g', sku: 'AJW-500', quantity: 1, unit: 'pack' },
      { productName: 'Sundarban Modhu 500ml', sku: 'SDM-500', quantity: 1, unit: 'jar' },
      { productName: 'Gift box (packaging)', sku: 'PKG-GFT', quantity: 1, unit: 'box' },
      { productName: 'Ribbon & card set', sku: 'PKG-RIB', quantity: 1, unit: 'set' },
    ],
    lastMixedAt: '2026-06-25T10:30:00.000Z',
    status: 'active',
  },
  {
    id: 'mix-3',
    name: 'Family Combo Pack',
    outputProductName: 'Modhu + Khejur Combo',
    outputSku: 'CMB-01',
    outputQty: 1,
    inputCount: 3,
    inputs: [
      { productName: 'Modhu (Honey) 350ml', sku: 'MDH-350', quantity: 2, unit: 'jar' },
      { productName: 'Dried Khejur 1kg', sku: 'DKJ-1K', quantity: 1, unit: 'pack' },
      { productName: 'Family gift wrap', sku: 'PKG-FAM', quantity: 1, unit: 'set' },
    ],
    status: 'draft',
  },
];
