import type {
  AdjustStockPayload,
  CreateAdjustmentPayload,
  CreateMixerRecipePayload,
  CreateProductPayload,
  CreatePurchasePayload,
  CreatePurchaseReturnPayload,
  CreateSupplierPayload,
  CreateUnitOfMeasurePayload,
  CreateWarehousePayload,
  InventoryLot,
  InventoryLotListResponse,
  InventoryProductDetail,
  InventoryReconciliationResponse,
  InventoryReportsQuery,
  InventoryReportsResponse,
  MixerRecipeListItem,
  MixerRecipeListResponse,
  PostReconciliationAdjustResponse,
  ProductActivityListResponse,
  ProductListQuery,
  ProductListResponse,
  ProductStatus,
  ProductionBatchListResponse,
  ProductionBatchResult,
  PurchaseDetail,
  PurchaseListItem,
  PurchaseListResponse,
  PurchasePaymentStatus,
  PurchaseReturnDetail,
  PurchaseReturnListItem,
  PurchaseReturnListResponse,
  ReceivePurchasePayload,
  RunProductionBatchPayload,
  StockAdjustmentListResponse,
  StockMovementListQuery,
  StockMovementListResponse,
  SupplierListItem,
  SupplierListResponse,
  TransferStockPayload,
  UnitOfMeasure,
  UnitOfMeasureListResponse,
  UpdateInventoryLotPayload,
  UpdateMixerRecipePayload,
  UpdateProductPayload,
  UpdatePurchasePayload,
  UpdateSupplierPayload,
  UpdateUnitOfMeasurePayload,
  UpdateWarehousePayload,
  Warehouse,
  WarehouseListResponse,
} from '@laam/types';
import { ApiError } from '@/lib/api/errors';

import {
  bulkUpdateMockProducts,
  cancelMockPurchase,
  completeMockPurchaseReturn,
  createMockAdjustment,
  createMockMixerRecipe,
  createMockProduct,
  createMockPurchase,
  createMockPurchaseReturn,
  createMockSupplier,
  createMockWarehouse,
  deleteMockMixerRecipe,
  deleteMockProduct,
  deleteMockSupplier,
  filterMockProducts,
  filterMockPurchases,
  getMockInventoryReports,
  getMockPurchaseReturn,
  getMockProductById,
  getMockPurchase,
  getMockReconciliation,
  listMockLots,
  listMockOrgStockMovements,
  MOCK_ADJUSTMENTS,
  MOCK_MIXER_RECIPES,
  MOCK_PRODUCTION_RUNS,
  MOCK_PURCHASE_RETURNS,
  MOCK_SUPPLIERS,
  MOCK_WAREHOUSES,
  previewProductionBatch,
  receiveMockPurchase,
  runProductionBatch,
  transferMockStock,
  updateMockMixerRecipe,
  updateMockProduct,
  updateMockPurchasePayment,
  updateMockSupplier,
  updateMockWarehouse,
  approveMockPurchaseReturn,
} from '@/features/inventory/data/mock-inventory';

export type InventoryApi = {
  listProducts: (query: ProductListQuery) => Promise<ProductListResponse>;
  getProduct: (
    id: string,
    opts?: { includeDeleted?: boolean },
  ) => Promise<InventoryProductDetail | null>;
  createProduct: (payload: CreateProductPayload) => Promise<InventoryProductDetail>;
  updateProduct: (id: string, patch: UpdateProductPayload) => Promise<InventoryProductDetail>;
  deleteProduct: (id: string, opts?: { hard?: boolean }) => Promise<void>;
  adjustStock: (productId: string, payload: AdjustStockPayload) => Promise<InventoryProductDetail>;
  /** Align default warehouse on-hand with catalog where warehouse was behind. */
  repairWarehouseStock: () => Promise<{ repaired: number }>;
  listStockMovements: (
    productId: string,
    query: { page: number; pageSize: number },
  ) => Promise<StockMovementListResponse>;
  listProductActivities: (
    productId: string,
    query: { page: number; pageSize: number },
  ) => Promise<ProductActivityListResponse>;
  uploadProductImage: (productId: string, file: File) => Promise<InventoryProductDetail>;
  restoreProduct: (id: string) => Promise<InventoryProductDetail>;
  bulkProductAction: (payload: {
    productIds: string[];
    status?: ProductStatus;
    category?: string;
    stockDelta?: number;
  }) => Promise<{ successCount: number; failedCount: number; message?: string }>;
  listSuppliers: (opts?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<SupplierListResponse>;
  createSupplier: (payload: CreateSupplierPayload) => Promise<SupplierListItem>;
  updateSupplier: (id: string, payload: UpdateSupplierPayload) => Promise<SupplierListItem>;
  deleteSupplier: (id: string) => Promise<void>;
  listPurchases: (opts?: {
    search?: string;
    page?: number;
    pageSize?: number;
    stockStatus?: string;
  }) => Promise<PurchaseListResponse>;
  getPurchase: (purchaseId: string) => Promise<PurchaseDetail>;
  createPurchase: (payload: CreatePurchasePayload) => Promise<PurchaseListItem>;
  updatePurchase: (purchaseId: string, payload: UpdatePurchasePayload) => Promise<PurchaseDetail>;
  updatePurchasePayment: (
    purchaseId: string,
    paymentStatus: PurchasePaymentStatus,
  ) => Promise<PurchaseListItem>;
  cancelPurchase: (purchaseId: string) => Promise<PurchaseListItem>;
  receivePurchase: (
    purchaseId: string,
    payload?: ReceivePurchasePayload,
  ) => Promise<PurchaseListItem>;
  listPurchaseReturns: (opts?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<PurchaseReturnListResponse>;
  getPurchaseReturn: (returnId: string) => Promise<PurchaseReturnDetail>;
  createPurchaseReturn: (payload: CreatePurchaseReturnPayload) => Promise<PurchaseReturnListItem>;
  approvePurchaseReturn: (returnId: string) => Promise<PurchaseReturnListItem>;
  rejectPurchaseReturn: (returnId: string) => Promise<PurchaseReturnListItem>;
  completePurchaseReturn: (returnId: string) => Promise<void>;
  listAdjustments: (opts?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<StockAdjustmentListResponse>;
  createAdjustment: (payload: CreateAdjustmentPayload) => Promise<void>;
  listMixerRecipes: (opts?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<MixerRecipeListResponse>;
  createMixerRecipe: (payload: CreateMixerRecipePayload) => Promise<MixerRecipeListItem>;
  updateMixerRecipe: (id: string, payload: UpdateMixerRecipePayload) => Promise<MixerRecipeListItem>;
  deleteMixerRecipe: (id: string) => Promise<void>;
  previewProduction: (payload: RunProductionBatchPayload) => Promise<ReturnType<typeof previewProductionBatch>>;
  runProduction: (payload: RunProductionBatchPayload) => Promise<ProductionBatchResult>;
  voidProduction: (id: string) => Promise<ProductionBatchResult>;
  listProductionRuns: (opts?: {
    page?: number;
    pageSize?: number;
  }) => Promise<ProductionBatchListResponse>;
  getReports: (query?: InventoryReportsQuery) => Promise<InventoryReportsResponse>;
  listOrgStockMovements: (query?: StockMovementListQuery) => Promise<StockMovementListResponse>;
  listWarehouses: () => Promise<WarehouseListResponse>;
  createWarehouse: (payload: CreateWarehousePayload) => Promise<Warehouse>;
  updateWarehouse: (id: string, payload: UpdateWarehousePayload) => Promise<Warehouse>;
  transferStock: (payload: TransferStockPayload) => Promise<void>;
  listLots: (opts?: {
    expiringWithinDays?: number;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    fefo?: boolean;
  }) => Promise<InventoryLotListResponse>;
  updateLot: (id: string, payload: UpdateInventoryLotPayload) => Promise<InventoryLot>;
  getReconciliation: () => Promise<InventoryReconciliationResponse>;
  postReconciliationAdjust: () => Promise<PostReconciliationAdjustResponse>;
  listUnits: () => Promise<UnitOfMeasureListResponse>;
  createUnit: (payload: CreateUnitOfMeasurePayload) => Promise<UnitOfMeasure>;
  updateUnit: (id: string, payload: UpdateUnitOfMeasurePayload) => Promise<UnitOfMeasure>;
  deleteUnit: (id: string) => Promise<void>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockInventoryApi(): InventoryApi {
  return {
    async listProducts(query) {
      await delay(120);
      return filterMockProducts(query);
    },
    async getProduct(id) {
      await delay(80);
      return getMockProductById(id) ?? null;
    },
    async createProduct(payload) {
      await delay(120);
      return createMockProduct(payload);
    },
    async updateProduct(id, patch) {
      await delay(100);
      const updated = updateMockProduct(id, patch);
      if (!updated) throw new Error('Product not found');
      return updated;
    },
    async deleteProduct(id) {
      await delay(80);
      if (!deleteMockProduct(id)) throw new Error('Product not found');
    },
    async adjustStock(productId, payload) {
      await delay(80);
      const product = updateMockProduct(productId, { stockAdjustment: payload });
      if (!product) throw new Error('Product not found');
      return product;
    },
    async repairWarehouseStock() {
      await delay(40);
      return { repaired: 0 };
    },
    async listStockMovements(productId, query) {
      await delay(60);
      const product = getMockProductById(productId);
      if (!product) throw new Error('Product not found');
      const all = MOCK_ADJUSTMENTS.filter((item) => item.productId === productId).map((item) => ({
        id: item.id,
        productId,
        variantId: product.variants[0]?.id ?? '',
        variantLabel: product.variants[0]?.label,
        variantSku: item.sku,
        previousStock: item.previousStock,
        delta: item.delta,
        newStock: item.newStock,
        reason: item.reason,
        note: item.note,
        actorName: item.adjustedBy,
        createdAt: item.adjustedAt,
      }));
      const start = (query.page - 1) * query.pageSize;
      return {
        items: all.slice(start, start + query.pageSize),
        total: all.length,
        page: query.page,
        pageSize: query.pageSize,
      };
    },
    async listProductActivities(productId, query) {
      await delay(40);
      const product = getMockProductById(productId);
      if (!product) throw new Error('Product not found');
      const all = product.activities ?? [];
      const start = (query.page - 1) * query.pageSize;
      return {
        items: all.slice(start, start + query.pageSize),
        total: all.length,
        page: query.page,
        pageSize: query.pageSize,
      };
    },
    async uploadProductImage(productId, file) {
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read image'));
        reader.readAsDataURL(file);
      });
      const product = updateMockProduct(productId, { imageUrl });
      if (!product) throw new Error('Product not found');
      return product;
    },
    async restoreProduct(id) {
      const product = getMockProductById(id);
      if (!product) throw new Error('Product not found');
      return updateMockProduct(id, { status: 'inactive' }) ?? product;
    },
    async bulkProductAction(payload) {
      await delay(150);
      const result = bulkUpdateMockProducts(payload);
      return { ...result, message: `Updated ${result.successCount} product(s)` };
    },
    async listSuppliers(opts) {
      await delay(100);
      const q = opts?.search?.trim().toLowerCase() ?? '';
      const items = MOCK_SUPPLIERS.filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          (s.contactPerson?.toLowerCase().includes(q) ?? false),
      );
      const page = opts?.page ?? 1;
      const pageSize = opts?.pageSize ?? 50;
      const start = (page - 1) * pageSize;
      return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
    },
    async createSupplier(payload) {
      await delay(100);
      return createMockSupplier(payload);
    },
    async updateSupplier(id, payload) {
      await delay(100);
      return updateMockSupplier(id, payload);
    },
    async deleteSupplier(id) {
      await delay(80);
      deleteMockSupplier(id);
    },
    async listPurchases(opts) {
      await delay(100);
      return filterMockPurchases(opts?.search);
    },
    async getPurchase(purchaseId) {
      await delay(80);
      return getMockPurchase(purchaseId);
    },
    async createPurchase(payload) {
      await delay(120);
      return createMockPurchase(payload);
    },
    async updatePurchase(purchaseId, payload) {
      await delay(100);
      if (payload.paymentStatus) updateMockPurchasePayment(purchaseId, payload.paymentStatus);
      return getMockPurchase(purchaseId);
    },
    async updatePurchasePayment(purchaseId, paymentStatus) {
      await delay(80);
      return updateMockPurchasePayment(purchaseId, paymentStatus);
    },
    async cancelPurchase(purchaseId) {
      await delay(80);
      return cancelMockPurchase(purchaseId);
    },
    async receivePurchase(purchaseId, payload) {
      await delay(120);
      return receiveMockPurchase(purchaseId, payload);
    },
    async listPurchaseReturns(opts) {
      await delay(80);
      const page = opts?.page ?? 1;
      const pageSize = opts?.pageSize ?? 50;
      const start = (page - 1) * pageSize;
      return {
        items: MOCK_PURCHASE_RETURNS.slice(start, start + pageSize),
        total: MOCK_PURCHASE_RETURNS.length,
        page,
        pageSize,
      };
    },
    async getPurchaseReturn(returnId) {
      await delay(80);
      return getMockPurchaseReturn(returnId);
    },
    async createPurchaseReturn(payload) {
      await delay(120);
      return createMockPurchaseReturn(payload);
    },
    async approvePurchaseReturn(returnId) {
      await delay(80);
      return approveMockPurchaseReturn(returnId);
    },
    async rejectPurchaseReturn(returnId) {
      await delay(80);
      const item = MOCK_PURCHASE_RETURNS.find((r) => r.id === returnId);
      if (!item) throw new Error('Purchase return not found');
      if (item.status === 'completed' || item.status === 'rejected') {
        throw new Error(`${item.returnNumber} cannot be rejected`);
      }
      item.status = 'rejected';
      return { ...item };
    },
    async completePurchaseReturn(returnId) {
      await delay(100);
      completeMockPurchaseReturn(returnId);
    },
    async listAdjustments(opts) {
      await delay(80);
      const page = opts?.page ?? 1;
      const pageSize = opts?.pageSize ?? 50;
      const start = (page - 1) * pageSize;
      return {
        items: MOCK_ADJUSTMENTS.slice(start, start + pageSize),
        total: MOCK_ADJUSTMENTS.length,
        page,
        pageSize,
      };
    },
    async createAdjustment(payload) {
      await delay(100);
      createMockAdjustment(payload);
    },
    async listMixerRecipes(opts) {
      await delay(80);
      const page = opts?.page ?? 1;
      const pageSize = opts?.pageSize ?? 25;
      const q = opts?.search?.trim().toLowerCase();
      const filtered = q
        ? MOCK_MIXER_RECIPES.filter(
            (r) =>
              r.name.toLowerCase().includes(q) ||
              r.outputProductName.toLowerCase().includes(q) ||
              r.outputSku.toLowerCase().includes(q),
          )
        : MOCK_MIXER_RECIPES;
      const start = (page - 1) * pageSize;
      return {
        items: filtered.slice(start, start + pageSize),
        total: filtered.length,
        page,
        pageSize,
      };
    },
    async createMixerRecipe(payload) {
      await delay(100);
      return createMockMixerRecipe(payload);
    },
    async updateMixerRecipe(id, payload) {
      await delay(100);
      return updateMockMixerRecipe(id, payload);
    },
    async deleteMixerRecipe(id) {
      await delay(80);
      deleteMockMixerRecipe(id);
    },
    async previewProduction(payload) {
      await delay(40);
      return previewProductionBatch(payload);
    },
    async runProduction(payload) {
      await delay(150);
      return runProductionBatch(payload);
    },
    async voidProduction(id) {
      await delay(120);
      const run = MOCK_PRODUCTION_RUNS.find((r) => r.id === id);
      if (!run) throw new Error('Production batch not found');
      if (run.voidedAt) throw new Error('Production batch is already voided');
      run.voidedAt = new Date().toISOString();
      run.voidedByName = 'Demo';
      return run;
    },
    async listProductionRuns(opts) {
      await delay(60);
      const page = opts?.page ?? 1;
      const pageSize = opts?.pageSize ?? 25;
      const start = (page - 1) * pageSize;
      return {
        items: MOCK_PRODUCTION_RUNS.slice(start, start + pageSize),
        total: MOCK_PRODUCTION_RUNS.length,
        page,
        pageSize,
      };
    },
    async getReports(query) {
      await delay(80);
      return getMockInventoryReports(query);
    },
    async listOrgStockMovements(query) {
      await delay(80);
      return listMockOrgStockMovements(query);
    },
    async listWarehouses() {
      await delay(60);
      return { items: MOCK_WAREHOUSES, total: MOCK_WAREHOUSES.length };
    },
    async createWarehouse(payload) {
      await delay(100);
      return createMockWarehouse(payload);
    },
    async updateWarehouse(id, payload) {
      await delay(100);
      return updateMockWarehouse(id, payload);
    },
    async transferStock(payload) {
      await delay(120);
      transferMockStock(payload);
    },
    async listLots(opts) {
      await delay(60);
      return listMockLots(opts?.expiringWithinDays);
    },
    async updateLot(id, payload) {
      await delay(60);
      const res = listMockLots();
      const lot = res.items.find((item) => item.id === id);
      if (!lot) throw new Error('Lot not found');
      return {
        ...lot,
        ...(payload.expiresAt !== undefined
          ? { expiresAt: payload.expiresAt ?? undefined }
          : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.barcode !== undefined ? { barcode: payload.barcode ?? undefined } : {}),
      };
    },
    async getReconciliation() {
      await delay(80);
      return getMockReconciliation();
    },
    async postReconciliationAdjust() {
      await delay(100);
      return {
        ok: true as const,
        differencePosted: 0,
        journalId: 'mock-journal',
        eventKey: 'mock-recon',
      };
    },
    async listUnits() {
      await delay(40);
      const { MOCK_UNITS } = await import('@/features/inventory/data/mock-inventory');
      return { items: MOCK_UNITS, total: MOCK_UNITS.length };
    },
    async createUnit(payload) {
      await delay(60);
      return {
        id: `uom-${Date.now()}`,
        code: payload.code,
        name: payload.name,
        dimension: payload.dimension ?? 'count',
        factorToDimensionBase: payload.factorToDimensionBase ?? 1,
        isSystem: false,
      };
    },
    async updateUnit(id, payload) {
      await delay(60);
      const { MOCK_UNITS } = await import('@/features/inventory/data/mock-inventory');
      const existing = MOCK_UNITS.find((u) => u.id === id);
      if (!existing) throw new Error('Unit not found');
      return { ...existing, ...payload };
    },
    async deleteUnit(_id) {
      await delay(40);
    },
  };
}

export function createHttpInventoryApi(): InventoryApi {
  return {
    async listProducts(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      if (query.filter) params.set('filter', query.filter);
      if (query.category) params.set('category', query.category);
      if (query.brandId) params.set('brandId', query.brandId);
      if (query.search) params.set('search', query.search);
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      return apiRequest<ProductListResponse>(`/crm/inventory/products?${params.toString()}`);
    },
    async getProduct(id, opts) {
      const { apiRequest } = await import('@/lib/api/client');
      try {
        const qs = opts?.includeDeleted ? '?includeDeleted=true' : '';
        return await apiRequest<InventoryProductDetail>(`/crm/inventory/products/${id}${qs}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    async createProduct(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<InventoryProductDetail>('/crm/inventory/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateProduct(id, patch) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<InventoryProductDetail>(`/crm/inventory/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },
    async deleteProduct(id, opts) {
      const { apiRequest } = await import('@/lib/api/client');
      const query = opts?.hard ? '?hard=true' : '';
      await apiRequest(`/crm/inventory/products/${id}${query}`, { method: 'DELETE' });
    },
    async adjustStock(productId, payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<InventoryProductDetail>(
        `/crm/inventory/products/${productId}/stock-adjust`,
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
    async repairWarehouseStock() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<{ repaired: number }>('/crm/inventory/products/repair-warehouse-stock', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    async listStockMovements(productId, query) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
      });
      return apiRequest<StockMovementListResponse>(
        `/crm/inventory/products/${productId}/stock-movements?${params.toString()}`,
      );
    },
    async listProductActivities(productId, query) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
      });
      return apiRequest<ProductActivityListResponse>(
        `/crm/inventory/products/${productId}/activities?${params.toString()}`,
      );
    },
    async uploadProductImage(productId, file) {
      const { apiRequest } = await import('@/lib/api/client');
      const body = new FormData();
      body.append('file', file);
      return apiRequest<InventoryProductDetail>(`/crm/inventory/products/${productId}/image`, {
        method: 'POST',
        body,
        json: false,
      });
    },
    async restoreProduct(id) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<InventoryProductDetail>(`/crm/inventory/products/${id}/restore`, {
        method: 'POST',
      });
    },
    async bulkProductAction(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<{ successCount: number; failedCount: number; message?: string }>(
        '/crm/inventory/products/bulk',
        { method: 'POST', body: JSON.stringify(payload) },
      );
    },
    async listSuppliers(opts) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      if (opts?.search) params.set('search', opts.search);
      params.set('page', String(opts?.page ?? 1));
      params.set('pageSize', String(opts?.pageSize ?? 50));
      return apiRequest<SupplierListResponse>(`/crm/inventory/suppliers?${params.toString()}`);
    },
    async createSupplier(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<SupplierListItem>('/crm/inventory/suppliers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateSupplier(id, payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<SupplierListItem>(`/crm/inventory/suppliers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    async deleteSupplier(id) {
      const { apiRequest } = await import('@/lib/api/client');
      await apiRequest(`/crm/inventory/suppliers/${id}`, { method: 'DELETE' });
    },
    async listPurchases(opts) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      if (opts?.search) params.set('search', opts.search);
      if (opts?.stockStatus) params.set('stockStatus', opts.stockStatus);
      params.set('page', String(opts?.page ?? 1));
      params.set('pageSize', String(opts?.pageSize ?? 50));
      return apiRequest<PurchaseListResponse>(`/crm/inventory/purchases?${params.toString()}`);
    },
    async getPurchase(purchaseId) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<PurchaseDetail>(`/crm/inventory/purchases/${purchaseId}`);
    },
    async createPurchase(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<PurchaseListItem>('/crm/inventory/purchases', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updatePurchase(purchaseId, payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<PurchaseDetail>(`/crm/inventory/purchases/${purchaseId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    async updatePurchasePayment(purchaseId, paymentStatus) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<PurchaseListItem>(`/crm/inventory/purchases/${purchaseId}/payment-status`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentStatus }),
      });
    },
    async cancelPurchase(purchaseId) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<PurchaseListItem>(`/crm/inventory/purchases/${purchaseId}/cancel`, {
        method: 'POST',
      });
    },
    async receivePurchase(purchaseId, payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<PurchaseListItem>(`/crm/inventory/purchases/${purchaseId}/receive`, {
        method: 'POST',
        body: JSON.stringify(payload ?? {}),
      });
    },
    async listPurchaseReturns(opts) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      if (opts?.search) params.set('search', opts.search);
      params.set('page', String(opts?.page ?? 1));
      params.set('pageSize', String(opts?.pageSize ?? 50));
      return apiRequest<PurchaseReturnListResponse>(
        `/crm/inventory/purchase-returns?${params.toString()}`,
      );
    },
    async getPurchaseReturn(returnId) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<PurchaseReturnDetail>(`/crm/inventory/purchase-returns/${returnId}`);
    },
    async createPurchaseReturn(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<PurchaseReturnListItem>('/crm/inventory/purchase-returns', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async approvePurchaseReturn(returnId) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<PurchaseReturnListItem>(
        `/crm/inventory/purchase-returns/${returnId}/approve`,
        { method: 'POST' },
      );
    },
    async rejectPurchaseReturn(returnId) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<PurchaseReturnListItem>(
        `/crm/inventory/purchase-returns/${returnId}/reject`,
        { method: 'POST' },
      );
    },
    async completePurchaseReturn(returnId) {
      const { apiRequest } = await import('@/lib/api/client');
      await apiRequest(`/crm/inventory/purchase-returns/${returnId}/complete`, { method: 'POST' });
    },
    async listAdjustments(opts) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      if (opts?.search) params.set('search', opts.search);
      params.set('page', String(opts?.page ?? 1));
      params.set('pageSize', String(opts?.pageSize ?? 50));
      return apiRequest<StockAdjustmentListResponse>(
        `/crm/inventory/adjustments?${params.toString()}`,
      );
    },
    async createAdjustment(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      await apiRequest('/crm/inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async listMixerRecipes(opts) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      if (opts?.search) params.set('search', opts.search);
      params.set('page', String(opts?.page ?? 1));
      params.set('pageSize', String(opts?.pageSize ?? 25));
      return apiRequest<MixerRecipeListResponse>(`/crm/inventory/mixer?${params.toString()}`);
    },
    async createMixerRecipe(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<MixerRecipeListItem>('/crm/inventory/mixer', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateMixerRecipe(id, payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<MixerRecipeListItem>(`/crm/inventory/mixer/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    async deleteMixerRecipe(id) {
      const { apiRequest } = await import('@/lib/api/client');
      await apiRequest(`/crm/inventory/mixer/${id}`, { method: 'DELETE' });
    },
    async previewProduction(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest('/crm/inventory/mixer/preview', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async runProduction(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<ProductionBatchResult>('/crm/inventory/mixer/run', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async voidProduction(id) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<ProductionBatchResult>(
        `/crm/inventory/mixer/runs/${encodeURIComponent(id)}/void`,
        { method: 'POST' },
      );
    },
    async listProductionRuns(opts) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      params.set('page', String(opts?.page ?? 1));
      params.set('pageSize', String(opts?.pageSize ?? 25));
      return apiRequest<ProductionBatchListResponse>(
        `/crm/inventory/mixer/runs?${params.toString()}`,
      );
    },
    async getReports(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      if (query?.dateFrom) params.set('dateFrom', query.dateFrom);
      if (query?.dateTo) params.set('dateTo', query.dateTo);
      const qs = params.toString();
      return apiRequest<InventoryReportsResponse>(
        `/crm/inventory/reports${qs ? `?${qs}` : ''}`,
      );
    },
    async listOrgStockMovements(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      params.set('page', String(query?.page ?? 1));
      params.set('pageSize', String(query?.pageSize ?? 50));
      if (query?.productId) params.set('productId', query.productId);
      if (query?.variantId) params.set('variantId', query.variantId);
      if (query?.warehouseId) params.set('warehouseId', query.warehouseId);
      if (query?.reason) params.set('reason', query.reason);
      if (query?.search) params.set('search', query.search);
      if (query?.dateFrom) params.set('dateFrom', query.dateFrom);
      if (query?.dateTo) params.set('dateTo', query.dateTo);
      if (query?.direction) params.set('direction', query.direction);
      return apiRequest<StockMovementListResponse>(
        `/crm/inventory/stock-movements?${params.toString()}`,
      );
    },
    async listWarehouses() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<WarehouseListResponse>('/crm/inventory/warehouses');
    },
    async createWarehouse(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<Warehouse>('/crm/inventory/warehouses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateWarehouse(id, payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<Warehouse>(`/crm/inventory/warehouses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    async transferStock(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      await apiRequest('/crm/inventory/warehouses/transfer', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async listLots(opts) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      if (opts?.expiringWithinDays != null) {
        params.set('expiringWithinDays', String(opts.expiringWithinDays));
      }
      if (opts?.status) params.set('status', opts.status);
      if (opts?.search) params.set('search', opts.search);
      if (opts?.fefo) params.set('fefo', '1');
      params.set('page', String(opts?.page ?? 1));
      params.set('pageSize', String(opts?.pageSize ?? 50));
      return apiRequest<InventoryLotListResponse>(`/crm/inventory/lots?${params.toString()}`);
    },
    async updateLot(id, payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<InventoryLot>(`/crm/inventory/lots/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    async getReconciliation() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<InventoryReconciliationResponse>('/crm/inventory/reconciliation');
    },
    async postReconciliationAdjust() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<PostReconciliationAdjustResponse>('/crm/inventory/reconciliation/adjust', {
        method: 'POST',
      });
    },
    async listUnits() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<UnitOfMeasureListResponse>('/crm/inventory/units');
    },
    async createUnit(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<UnitOfMeasure>('/crm/inventory/units', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateUnit(id, payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<UnitOfMeasure>(`/crm/inventory/units/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    async deleteUnit(id) {
      const { apiRequest } = await import('@/lib/api/client');
      await apiRequest(`/crm/inventory/units/${id}`, { method: 'DELETE' });
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const inventoryApi = useHttpApi ? createHttpInventoryApi() : createMockInventoryApi();
