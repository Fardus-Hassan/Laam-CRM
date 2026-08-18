import type {
  CreateAdjustmentPayload,
  CreateMixerRecipePayload,
  CreateProductPayload,
  CreatePurchasePayload,
  CreatePurchaseReturnPayload,
  CreateSupplierPayload,
  CreateWarehousePayload,
  InventoryLot,
  InventoryLotListResponse,
  InventoryProductDetail,
  InventoryProductListItem,
  InventoryReconciliationResponse,
  MixerRecipeListItem,
  ProductCategory,
  ProductFilterCount,
  ProductListQuery,
  ProductListResponse,
  ProductionBatchResult,
  InventoryReportsQuery,
  PurchaseDetail,
  PurchaseListItem,
  PurchasePaymentStatus,
  PurchaseReturnDetail,
  PurchaseReturnListItem,
  RunProductionBatchPayload,
  StockAdjustmentListItem,
  StockMovement,
  StockMovementListQuery,
  StockMovementListResponse,
  SupplierListItem,
  TransferStockPayload,
  UnitOfMeasure,
  UpdateMixerRecipePayload,
  UpdateProductPayload,
  UpdateSupplierPayload,
  UpdateWarehousePayload,
  Warehouse,
} from '@laam/types';

import {
  postInventoryProduction,
  postInventoryPurchase,
  postInventoryWriteOff,
} from '@/features/accounting/data/mock-accounting';

import { MOCK_PRODUCTS } from '@/features/orders/data/mock-products';
import { PRODUCT_FILTERS } from '@/features/inventory/config/product-filters';

export const MOCK_UNITS: UnitOfMeasure[] = [
  { id: 'uom-pcs', code: 'pcs', name: 'Pieces', dimension: 'count', factorToDimensionBase: 1, isSystem: true },
  { id: 'uom-box', code: 'box', name: 'Box', dimension: 'count', factorToDimensionBase: 1, isSystem: true },
  { id: 'uom-dozen', code: 'dozen', name: 'Dozen', dimension: 'count', factorToDimensionBase: 12, isSystem: true },
  { id: 'uom-g', code: 'g', name: 'Gram', dimension: 'mass', factorToDimensionBase: 1, isSystem: true },
  { id: 'uom-kg', code: 'kg', name: 'Kilogram', dimension: 'mass', factorToDimensionBase: 1000, isSystem: true },
  { id: 'uom-ml', code: 'ml', name: 'Millilitre', dimension: 'volume', factorToDimensionBase: 1, isSystem: true },
  { id: 'uom-l', code: 'L', name: 'Litre', dimension: 'volume', factorToDimensionBase: 1000, isSystem: true },
];

function mockConvertToBase(quantity: number, uomCode?: string): number {
  const code = (uomCode ?? 'pcs').toLowerCase();
  const unit = MOCK_UNITS.find((u) => u.code.toLowerCase() === code) ?? MOCK_UNITS[0];
  const pcs = MOCK_UNITS.find((u) => u.code === 'pcs')!;
  if (unit.dimension !== pcs.dimension) {
    if (code === 'kg') return Math.round(quantity * 1000);
    if (code === 'g') return Math.round(quantity);
    if (code === 'dozen') return Math.round(quantity * 12);
    return Math.round(quantity);
  }
  return Math.max(1, Math.round((quantity * unit.factorToDimensionBase) / pcs.factorToDimensionBase));
}

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
    tags: index % 3 === 0 ? ['Campaign'] : [],
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
        actorName: 'Sakib Ahmed (sakib@laamcrm.com)',
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
    if (query.brandId && item.brandId !== query.brandId) return false;
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

  const listItems = allMatching.map(
    ({ activities: _a, variants, notes: _n, description: _d, ...li }) => ({
      ...li,
      primaryVariantId: variants[0]?.id,
      primaryBaseUomCode: variants[0]?.baseUomCode,
    }),
  );
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
    category: payload.category ?? 'other',
    categoryId: payload.categoryId,
    brandId: payload.brandId,
    status: payload.status,
    stock,
    reorderLevel: reorder,
    stockStatus: stockStatus(stock, reorder),
    variantCount: payload.variants.length,
    primaryVariantId: payload.variants[0]?.id,
    primaryBaseUomCode: payload.variants[0]?.baseUomCode,
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
      { id: `${id}-a1`, label: 'Product created', timestamp: now, actorName: 'Sakib Ahmed (sakib@laamcrm.com)' },
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
    categoryId: patch.categoryId === null ? undefined : (patch.categoryId ?? current.categoryId),
    brandId: patch.brandId === null ? undefined : (patch.brandId ?? current.brandId),
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
              actorName: 'Sakib Ahmed (sakib@laamcrm.com)',
            },
          ]
        : []),
    ],
  };
  MOCK_INVENTORY_PRODUCTS[index] = updated;
  return updated;
}

export function deleteMockProduct(id: string): boolean {
  const index = MOCK_INVENTORY_PRODUCTS.findIndex((p) => p.id === id);
  if (index === -1) return false;
  MOCK_INVENTORY_PRODUCTS.splice(index, 1);
  return true;
}

export function bulkUpdateMockProducts(payload: {
  productIds: string[];
  status?: InventoryProductListItem['status'];
  category?: string;
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

export function createMockSupplier(payload: CreateSupplierPayload): SupplierListItem {
  const name = payload.name.trim();
  if (MOCK_SUPPLIERS.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('A supplier with this name already exists');
  }
  const item: SupplierListItem = {
    id: `sup-${Date.now()}`,
    name,
    contactPerson: payload.contactPerson?.trim() || undefined,
    phone: payload.phone.trim(),
    email: payload.email?.trim() || undefined,
    address: payload.address?.trim() || undefined,
    balance: 0,
    productCount: 0,
    status: payload.status ?? 'active',
    tags: payload.tags ?? [],
  };
  MOCK_SUPPLIERS.unshift(item);
  return { ...item };
}

export function updateMockSupplier(
  id: string,
  payload: UpdateSupplierPayload,
): SupplierListItem {
  const item = MOCK_SUPPLIERS.find((s) => s.id === id);
  if (!item) throw new Error('Supplier not found');
  if (payload.name !== undefined) {
    const name = payload.name.trim();
    if (MOCK_SUPPLIERS.some((s) => s.id !== id && s.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('A supplier with this name already exists');
    }
    item.name = name;
  }
  if (payload.contactPerson !== undefined) item.contactPerson = payload.contactPerson.trim() || undefined;
  if (payload.phone !== undefined) item.phone = payload.phone.trim();
  if (payload.email !== undefined) item.email = payload.email.trim() || undefined;
  if (payload.address !== undefined) item.address = payload.address.trim() || undefined;
  if (payload.status !== undefined) item.status = payload.status;
  if (payload.tags !== undefined) item.tags = payload.tags;
  return { ...item };
}

export function deleteMockSupplier(id: string): void {
  const index = MOCK_SUPPLIERS.findIndex((s) => s.id === id);
  if (index < 0) throw new Error('Supplier not found');
  if (MOCK_PURCHASES.some((p) => p.supplierId === id)) {
    throw new Error('Supplier has purchase history — mark inactive instead of deleting');
  }
  MOCK_SUPPLIERS.splice(index, 1);
}

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
      unpaidTotal: items
        .filter((p) => p.paymentStatus !== 'paid' && p.stockStatus !== 'cancelled')
        .reduce((s, p) => s + p.totalAmount, 0),
      pendingReceipt: items.filter((p) => p.stockStatus === 'pending').length,
    },
  };
}

export function getMockPurchase(purchaseId: string): PurchaseDetail {
  const purchase = MOCK_PURCHASES.find((p) => p.id === purchaseId);
  if (!purchase) throw new Error('Purchase order not found');
  const product = MOCK_INVENTORY_PRODUCTS[0];
  const variant = product?.variants[0];
  const quantity = Math.max(1, purchase.itemCount);
  const unitCost = variant?.costPrice ?? Math.round(purchase.totalAmount / quantity);
  const receivedQuantity =
    purchase.stockStatus === 'received'
      ? quantity
      : purchase.stockStatus === 'partial'
        ? Math.floor(quantity / 2)
        : 0;
  return {
    ...purchase,
    lines: [
      {
        id: `${purchase.id}-line-1`,
        productId: product?.id ?? 'prod-1',
        productName: product?.name ?? 'Demo product',
        productSku: product?.sku ?? 'DEMO',
        variantId: variant?.id ?? 'var-1',
        variantLabel: variant?.label ?? 'Standard',
        variantSku: variant?.sku ?? 'DEMO-STD',
        quantity,
        receivedQuantity,
        remainingQuantity: Math.max(0, quantity - receivedQuantity),
        unitCost,
        lineTotal: quantity * unitCost,
      },
    ],
  };
}

export function updateMockPurchasePayment(
  purchaseId: string,
  paymentStatus: PurchasePaymentStatus,
): PurchaseListItem {
  const purchase = MOCK_PURCHASES.find((p) => p.id === purchaseId);
  if (!purchase) throw new Error('Purchase order not found');
  if (purchase.stockStatus === 'cancelled') {
    throw new Error('Cannot update payment on a cancelled purchase');
  }
  purchase.paymentStatus = paymentStatus;
  return { ...purchase };
}

export function cancelMockPurchase(purchaseId: string): PurchaseListItem {
  const purchase = MOCK_PURCHASES.find((p) => p.id === purchaseId);
  if (!purchase) throw new Error('Purchase order not found');
  if (purchase.stockStatus !== 'pending') {
    throw new Error(
      purchase.stockStatus === 'cancelled'
        ? `${purchase.purchaseNumber} is already cancelled`
        : `Only pending purchases can be cancelled (${purchase.purchaseNumber} is ${purchase.stockStatus})`,
    );
  }
  purchase.stockStatus = 'cancelled';
  return { ...purchase };
}

/** Receive PO stock (full remaining by default) — updates PO status, stock, and accounting. */
export function receiveMockPurchase(
  purchaseId: string,
  _payload?: { warehouseId?: string; lines?: { lineId: string; quantity: number; expiresAt?: string }[] },
): PurchaseListItem {
  const purchase = MOCK_PURCHASES.find((p) => p.id === purchaseId);
  if (!purchase) {
    throw new Error('Purchase order not found');
  }
  if (purchase.stockStatus === 'received') {
    throw new Error(`${purchase.purchaseNumber} already received`);
  }
  if (purchase.stockStatus === 'cancelled') {
    throw new Error(`${purchase.purchaseNumber} is cancelled`);
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

export function createMockPurchase(payload: CreatePurchasePayload): PurchaseListItem {
  const supplier = MOCK_SUPPLIERS.find((s) => s.id === payload.supplierId);
  if (!supplier || supplier.status !== 'active') {
    throw new Error('Invalid or inactive supplier');
  }
  const purchaseNumber = payload.purchaseNumber.trim().toUpperCase();
  if (MOCK_PURCHASES.some((p) => p.purchaseNumber === purchaseNumber)) {
    throw new Error('A purchase with this number already exists');
  }
  const normalizedLines = payload.lines.map((line) => ({
    ...line,
    quantity: mockConvertToBase(line.quantity, line.uomCode),
  }));
  const item: PurchaseListItem = {
    id: `pur-${Date.now()}`,
    purchaseNumber,
    supplierName: supplier.name,
    supplierId: supplier.id,
    itemCount: normalizedLines.reduce((sum, line) => sum + line.quantity, 0),
    totalAmount: normalizedLines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0),
    paymentStatus: payload.paymentStatus ?? 'unpaid',
    stockStatus: 'pending',
    purchaseDate: payload.purchaseDate,
    dueDate: payload.dueDate,
    notes: payload.notes,
  };
  MOCK_PURCHASES.unshift(item);
  return { ...item };
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

export function createMockPurchaseReturn(
  payload: CreatePurchaseReturnPayload,
): PurchaseReturnListItem {
  const returnNumber = payload.returnNumber.trim().toUpperCase();
  if (MOCK_PURCHASE_RETURNS.some((r) => r.returnNumber === returnNumber)) {
    throw new Error('A purchase return with this number already exists');
  }
  const item: PurchaseReturnListItem = {
    id: `pr-${Date.now()}`,
    returnNumber,
    purchaseNumber: payload.purchaseNumber.trim().toUpperCase(),
    supplierName: payload.supplierName.trim(),
    itemCount: payload.lines.reduce((sum, line) => sum + line.quantity, 0),
    totalAmount: payload.lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0),
    status: 'pending',
    returnDate: payload.returnDate,
    reason: payload.reason,
  };
  MOCK_PURCHASE_RETURNS.unshift(item);
  return { ...item };
}

export function completeMockPurchaseReturn(returnId: string): void {
  const item = MOCK_PURCHASE_RETURNS.find((r) => r.id === returnId);
  if (!item) throw new Error('Purchase return not found');
  if (item.status === 'completed') {
    throw new Error(`${item.returnNumber} is already completed`);
  }
  if (item.status !== 'pending' && item.status !== 'approved') {
    throw new Error(`${item.returnNumber} cannot be completed from status ${item.status}`);
  }
  item.status = 'completed';
}

export function approveMockPurchaseReturn(returnId: string): PurchaseReturnListItem {
  const item = MOCK_PURCHASE_RETURNS.find((r) => r.id === returnId);
  if (!item) throw new Error('Purchase return not found');
  if (item.status === 'completed') {
    throw new Error(`${item.returnNumber} is already completed`);
  }
  if (item.status === 'approved') {
    throw new Error(`${item.returnNumber} is already approved`);
  }
  item.status = 'approved';
  return { ...item };
}

export function getMockPurchaseReturn(returnId: string): PurchaseReturnDetail {
  const item = MOCK_PURCHASE_RETURNS.find((r) => r.id === returnId);
  if (!item) throw new Error('Purchase return not found');
  const product = MOCK_INVENTORY_PRODUCTS[0];
  const variant = product?.variants[0];
  const quantity = Math.max(1, item.itemCount);
  const unitCost = variant?.costPrice ?? Math.round(item.totalAmount / quantity);
  return {
    ...item,
    createdAt: `${item.returnDate}T10:00:00.000Z`,
    completedAt: item.status === 'completed' ? `${item.returnDate}T16:00:00.000Z` : undefined,
    lines: [
      {
        id: `${item.id}-line-1`,
        productId: product?.id ?? 'prod-1',
        productName: product?.name ?? 'Demo product',
        productSku: product?.sku ?? 'DEMO',
        variantId: variant?.id ?? 'var-1',
        variantLabel: variant?.label ?? 'Standard',
        variantSku: variant?.sku ?? 'DEMO-STD',
        quantity,
        unitCost,
        lineTotal: quantity * unitCost,
      },
    ],
  };
}

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
    adjustedBy: [
      'Sakib Ahmed (sakib@laamcrm.com)',
      'Fatema Akter (fatema@laamcrm.com)',
      'Karim Hassan (karim@laamcrm.com)',
    ][i % 3],
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
    adjustedBy: 'Sakib Ahmed (sakib@laamcrm.com)',
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

function qtyToKg(quantity: number, unit: string) {
  const u = unit.toLowerCase();
  if (u === 'kg') return quantity;
  if (u === 'g') return quantity / 1000;
  if (u === 'mg') return quantity / 1_000_000;
  return quantity;
}

function qtyToGrams(quantity: number, unit: string) {
  const u = unit.toLowerCase();
  if (u === 'kg') return quantity * 1000;
  if (u === 'g') return quantity;
  if (u === 'mg') return quantity / 1000;
  return quantity;
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

  const raws = (payload.rawMaterials ?? []).filter(
    (r) => r.productId?.trim() && r.name.trim() && r.quantity > 0,
  );
  const lines = (payload.outputs ?? []).filter((o) => o.units > 0);
  if (!raws.length) {
    return { ...empty, limitedBy: 'Add at least one linked raw material' };
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
    outputProductId: 'prod-combo-1',
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
    outputProductId: 'prod-gift-1',
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
    outputProductId: 'prod-combo-1',
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
export function createMockMixerRecipe(payload: CreateMixerRecipePayload): MixerRecipeListItem {
  const output = getMockProductById(payload.outputProductId);
  if (!output) throw new Error('Invalid or deleted product');
  const inputs = payload.inputs.map((input) => {
    const product = getMockProductById(input.productId);
    if (!product) throw new Error('A recipe input references an invalid product');
    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: input.quantity,
      unit: input.unit,
    };
  });
  const item: MixerRecipeListItem = {
    id: `mix-${Date.now()}`,
    name: payload.name.trim(),
    outputProductId: output.id,
    outputProductName: output.name,
    outputSku: output.sku,
    outputQty: payload.outputQty,
    inputCount: inputs.length,
    inputs,
    status: payload.status ?? 'draft',
  };
  MOCK_MIXER_RECIPES.unshift(item);
  return { ...item };
}

export function updateMockMixerRecipe(
  id: string,
  payload: UpdateMixerRecipePayload,
): MixerRecipeListItem {
  const item = MOCK_MIXER_RECIPES.find((r) => r.id === id);
  if (!item) throw new Error('Mixer recipe not found');
  if (payload.name !== undefined) item.name = payload.name.trim();
  if (payload.outputQty !== undefined) item.outputQty = payload.outputQty;
  if (payload.status !== undefined) item.status = payload.status;
  if (payload.outputProductId !== undefined) {
    const output = getMockProductById(payload.outputProductId);
    if (!output) throw new Error('Invalid or deleted product');
    item.outputProductId = output.id;
    item.outputProductName = output.name;
    item.outputSku = output.sku;
  }
  if (payload.inputs !== undefined) {
    item.inputs = payload.inputs.map((input) => {
      const product = getMockProductById(input.productId);
      if (!product) throw new Error('A recipe input references an invalid product');
      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: input.quantity,
        unit: input.unit,
      };
    });
    item.inputCount = item.inputs.length;
  }
  return { ...item };
}

export function deleteMockMixerRecipe(id: string): void {
  const index = MOCK_MIXER_RECIPES.findIndex((r) => r.id === id);
  if (index < 0) throw new Error('Mixer recipe not found');
  MOCK_MIXER_RECIPES.splice(index, 1);
}

export function getMockInventoryReports(
  query: InventoryReportsQuery = {},
): import('@laam/types').InventoryReportsResponse {
  const lowStock = MOCK_INVENTORY_PRODUCTS.flatMap((product) =>
    product.variants
      .filter((variant) => variant.stock <= variant.reorderLevel)
      .map((variant) => ({
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        sku: variant.sku,
        variantLabel: variant.label,
        stock: variant.stock,
        reorderLevel: variant.reorderLevel,
        status: (variant.stock <= 0 ? 'out_of_stock' : 'low_stock') as 'low_stock' | 'out_of_stock',
        unitCost: variant.costPrice,
        stockValueAtCost: variant.stock * (variant.costPrice ?? 0),
      })),
  ).slice(0, 20);

  const allVariants = MOCK_INVENTORY_PRODUCTS.flatMap((product) =>
    product.variants.map((variant) => ({ product, variant })),
  );
  const totalStockUnits = allVariants.reduce((sum, row) => sum + row.variant.stock, 0);
  const inventoryValuationAtCost = allVariants.reduce(
    (sum, row) => sum + row.variant.stock * (row.variant.costPrice ?? 0),
    0,
  );

  const inRange = (isoDate: string) => {
    const day = isoDate.slice(0, 10);
    if (query.dateFrom && day < query.dateFrom) return false;
    if (query.dateTo && day > query.dateTo) return false;
    return true;
  };

  const purchases = MOCK_PURCHASES.filter((p) => inRange(p.purchaseDate)).slice(0, 8);
  const returns = MOCK_PURCHASE_RETURNS.filter((r) => inRange(r.returnDate)).slice(0, 8);
  const production = MOCK_PRODUCTION_RUNS.filter((run) => inRange(run.createdAt)).slice(0, 8);
  const movements = MOCK_ADJUSTMENTS.filter((adj) => inRange(adj.adjustedAt)).slice(0, 12).map((adj) => {
    const product = MOCK_INVENTORY_PRODUCTS.find((p) => p.id === adj.productId);
    const variant = product?.variants[0];
    return {
      id: adj.id,
      productId: adj.productId,
      productName: adj.productName,
      productSku: adj.sku,
      variantId: variant?.id ?? `${adj.productId}-v1`,
      variantLabel: variant?.label ?? 'Standard',
      variantSku: variant?.sku ?? adj.sku,
      delta: adj.delta,
      previousStock: adj.previousStock,
      newStock: adj.newStock,
      reason: adj.reason,
      note: adj.note,
      actorName: adj.adjustedBy,
      occurredAt: adj.adjustedAt,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    period: {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    },
    summary: {
      skuCount: allVariants.length,
      totalStockUnits,
      inventoryValuationAtCost,
      uncostedSkuCount: 0,
      lowStockCount: lowStock.length,
      pendingPurchases: MOCK_PURCHASES.filter((p) => p.stockStatus === 'pending' || p.stockStatus === 'partial').length,
      pendingReturns: MOCK_PURCHASE_RETURNS.filter((r) => r.status !== 'completed').length,
    },
    lowStock,
    recent: {
      purchases: purchases.map((p) => ({
        id: p.id,
        purchaseNumber: p.purchaseNumber,
        supplierName: p.supplierName,
        stockStatus: p.stockStatus,
        paymentStatus: p.paymentStatus,
        itemCount: p.itemCount,
        totalAmount: p.totalAmount,
        occurredAt: `${p.purchaseDate}T00:00:00.000Z`,
      })),
      returns: returns.map((r) => ({
        id: r.id,
        returnNumber: r.returnNumber,
        supplierName: r.supplierName,
        status: r.status,
        itemCount: r.itemCount,
        totalAmount: r.totalAmount,
        occurredAt: `${r.returnDate}T00:00:00.000Z`,
      })),
      production: production.map((run) => ({
        id: run.id,
        batchNumber: run.batchNumber,
        productId: run.outputProductId,
        productName: run.outputProductName,
        unitsProduced: run.unitsProduced,
        materialCost: run.materialCost,
        occurredAt: run.createdAt,
      })),
      movements,
    },
    valuationBreakdown: {
      categories: [
        { label: 'Honey', units: Math.round(totalStockUnits * 0.4), valueAtCost: Math.round(inventoryValuationAtCost * 0.45) },
        { label: 'Dates', units: Math.round(totalStockUnits * 0.25), valueAtCost: Math.round(inventoryValuationAtCost * 0.25) },
        { label: 'Other', units: Math.round(totalStockUnits * 0.35), valueAtCost: Math.round(inventoryValuationAtCost * 0.3) },
      ],
      brands: [
        { label: "Laam Demo", units: Math.round(totalStockUnits * 0.6), valueAtCost: Math.round(inventoryValuationAtCost * 0.55) },
        { label: "Unbranded", units: Math.round(totalStockUnits * 0.4), valueAtCost: Math.round(inventoryValuationAtCost * 0.45) },
      ],
    },
  };
}

// ---- Warehouses, org-wide stock ledger, lots, reconciliation ----

export const MOCK_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-main',
    code: 'MAIN',
    name: 'Main warehouse',
    address: 'Tejgaon, Dhaka',
    isDefault: true,
    isActive: true,
    skuCount: 24,
    totalUnits: 860,
  },
  {
    id: 'wh-ctg',
    code: 'CTG',
    name: 'Chittagong depot',
    address: 'Agrabad, Chittagong',
    isDefault: false,
    isActive: true,
    skuCount: 9,
    totalUnits: 210,
  },
];

export function createMockWarehouse(payload: CreateWarehousePayload): Warehouse {
  const warehouse: Warehouse = {
    id: `wh-${Date.now()}`,
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    address: payload.address?.trim() || undefined,
    isDefault: payload.isDefault ?? false,
    isActive: true,
    skuCount: 0,
    totalUnits: 0,
  };
  if (warehouse.isDefault) {
    MOCK_WAREHOUSES.forEach((w) => (w.isDefault = false));
  }
  MOCK_WAREHOUSES.push(warehouse);
  return warehouse;
}

export function updateMockWarehouse(id: string, payload: UpdateWarehousePayload): Warehouse {
  const warehouse = MOCK_WAREHOUSES.find((w) => w.id === id);
  if (!warehouse) throw new Error('Warehouse not found');
  if (payload.code !== undefined) warehouse.code = payload.code.trim().toUpperCase();
  if (payload.name !== undefined) warehouse.name = payload.name.trim();
  if (payload.address !== undefined) warehouse.address = payload.address.trim() || undefined;
  if (payload.isActive !== undefined) warehouse.isActive = payload.isActive;
  if (payload.isDefault) {
    MOCK_WAREHOUSES.forEach((w) => (w.isDefault = w.id === id));
  }
  return warehouse;
}

const MOCK_ORG_MOVEMENTS: StockMovement[] = MOCK_ADJUSTMENTS.map((adj, i) => {
  const product = MOCK_INVENTORY_PRODUCTS.find((p) => p.id === adj.productId);
  const variant = product?.variants[0];
  const warehouse = MOCK_WAREHOUSES[i % MOCK_WAREHOUSES.length];
  return {
    id: `mov-${i + 1}`,
    productId: adj.productId,
    productName: adj.productName,
    productSku: adj.sku,
    variantId: variant?.id ?? `${adj.productId}-v1`,
    variantLabel: variant?.label ?? 'Standard',
    variantSku: variant?.sku ?? adj.sku,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    delta: adj.delta,
    previousStock: adj.previousStock,
    newStock: adj.newStock,
    unitCost: variant?.costPrice,
    valueDelta: adj.delta * (variant?.costPrice ?? 0),
    reason: adj.reason,
    note: adj.note,
    actorName: adj.adjustedBy,
    createdAt: adj.adjustedAt,
  };
});

export function transferMockStock(payload: TransferStockPayload): void {
  const product = getMockProductById(payload.productId);
  if (!product) throw new Error('Product not found');
  const variant = product.variants.find((v) => v.id === payload.variantId);
  if (!variant) throw new Error('Variant not found');
  const from = MOCK_WAREHOUSES.find((w) => w.id === payload.fromWarehouseId);
  const to = MOCK_WAREHOUSES.find((w) => w.id === payload.toWarehouseId);
  if (!from || !to) throw new Error('Warehouse not found');
  if (from.id === to.id) throw new Error('Source and destination must differ');
  const now = new Date().toISOString();
  const base = {
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    variantId: variant.id,
    variantLabel: variant.label,
    variantSku: variant.sku,
    unitCost: variant.costPrice,
    note: payload.note,
    actorName: 'Sakib Ahmed (sakib@laamcrm.com)',
    createdAt: now,
  };
  MOCK_ORG_MOVEMENTS.unshift(
    {
      ...base,
      id: `mov-out-${Date.now()}`,
      warehouseId: from.id,
      warehouseName: from.name,
      delta: -payload.quantity,
      previousStock: variant.stock,
      newStock: variant.stock,
      valueDelta: -payload.quantity * (variant.costPrice ?? 0),
      reason: 'warehouse_transfer_out',
    },
    {
      ...base,
      id: `mov-in-${Date.now()}`,
      warehouseId: to.id,
      warehouseName: to.name,
      delta: payload.quantity,
      previousStock: 0,
      newStock: payload.quantity,
      valueDelta: payload.quantity * (variant.costPrice ?? 0),
      reason: 'warehouse_transfer_in',
    },
  );
  from.totalUnits = Math.max(0, (from.totalUnits ?? 0) - payload.quantity);
  to.totalUnits = (to.totalUnits ?? 0) + payload.quantity;
}

export function listMockOrgStockMovements(
  query: StockMovementListQuery = {},
): StockMovementListResponse {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 50;
  const q = query.search?.trim().toLowerCase() ?? '';
  const filtered = MOCK_ORG_MOVEMENTS.filter((m) => {
    if (query.productId && m.productId !== query.productId) return false;
    if (query.variantId && m.variantId !== query.variantId) return false;
    if (query.warehouseId && m.warehouseId !== query.warehouseId) return false;
    if (query.reason && m.reason !== query.reason) return false;
    if (query.direction === 'in' && m.delta <= 0) return false;
    if (query.direction === 'out' && m.delta >= 0) return false;
    const day = m.createdAt.slice(0, 10);
    if (query.dateFrom && day < query.dateFrom) return false;
    if (query.dateTo && day > query.dateTo) return false;
    if (
      q &&
      !(
        m.productName?.toLowerCase().includes(q) ||
        m.productSku?.toLowerCase().includes(q) ||
        m.variantSku?.toLowerCase().includes(q) ||
        m.reason.toLowerCase().includes(q) ||
        (m.note?.toLowerCase().includes(q) ?? false)
      )
    ) {
      return false;
    }
    return true;
  });
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

export const MOCK_LOTS: InventoryLot[] = MOCK_INVENTORY_PRODUCTS.slice(0, 8).map((product, i) => {
  const variant = product.variants[0];
  const warehouse = MOCK_WAREHOUSES[i % MOCK_WAREHOUSES.length];
  const daysToExpiry = [12, 30, 55, 90, 180, 240, 300, 360][i % 8];
  const expiresAt = new Date(Date.now() + daysToExpiry * 86_400_000).toISOString();
  return {
    id: `lot-${i + 1}`,
    variantId: variant.id,
    productId: product.id,
    productName: product.name,
    variantLabel: variant.label,
    variantSku: variant.sku,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    lotNumber: `LOT-2026-${String(i + 1).padStart(3, '0')}`,
    receivedAt: `2026-0${1 + (i % 6)}-10T09:00:00.000Z`,
    expiresAt,
    quantity: 10 + i * 4,
    unitCost: variant.costPrice,
    status: 'active',
    daysToExpiry,
  };
});

export function listMockLots(expiringWithinDays?: number): InventoryLotListResponse {
  const items = expiringWithinDays
    ? MOCK_LOTS.filter(
        (lot) => lot.daysToExpiry !== undefined && lot.daysToExpiry <= expiringWithinDays,
      )
    : MOCK_LOTS;
  return { items, total: items.length };
}

export function getMockReconciliation(): InventoryReconciliationResponse {
  const valuation = MOCK_INVENTORY_PRODUCTS.reduce(
    (sum, product) =>
      sum +
      product.variants.reduce((s, v) => s + v.stock * (v.costPrice ?? 0), 0),
    0,
  );
  const glBalance = Math.round(valuation);
  return {
    generatedAt: new Date().toISOString(),
    inventoryValuationAtCost: valuation,
    inventoryGlBalance: glBalance,
    difference: valuation - glBalance,
    isBalanced: Math.abs(valuation - glBalance) < 1,
    accounts: [
      {
        accountCode: '1400',
        accountName: 'Inventory',
        debit: glBalance,
        credit: 0,
        balance: glBalance,
      },
      {
        accountCode: '5000',
        accountName: 'Cost of goods sold',
        debit: Math.round(valuation * 0.4),
        credit: 0,
        balance: Math.round(valuation * 0.4),
      },
    ],
    recentJournals: MOCK_PURCHASES.slice(0, 5).map((p, i) => ({
      id: `jrn-${i + 1}`,
      entryDate: p.purchaseDate,
      description: `Stock received — ${p.purchaseNumber}`,
      reference: p.purchaseNumber,
      sourceType: 'purchase',
      sourceId: p.id,
      amount: p.totalAmount,
    })),
    expiringLots: listMockLots(60).items,
  };
}
