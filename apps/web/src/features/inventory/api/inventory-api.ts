import type {
  AdjustStockPayload,
  CreateAdjustmentPayload,
  CreateProductPayload,
  InventoryProductDetail,
  MixerRecipeListResponse,
  ProductListQuery,
  ProductListResponse,
  ProductStatus,
  ProductionBatchListResponse,
  ProductionBatchResult,
  PurchaseListResponse,
  PurchaseReturnListResponse,
  RunProductionBatchPayload,
  StockAdjustmentListResponse,
  StockMovementListResponse,
  SupplierListResponse,
  UpdateProductPayload,
} from '@laam/types';
import { ApiError } from '@/lib/api/errors';

import {
  bulkUpdateMockProducts,
  createMockAdjustment,
  createMockProduct,
  deleteMockProduct,
  filterMockProducts,
  filterMockPurchases,
  getMockProductById,
  MOCK_ADJUSTMENTS,
  MOCK_MIXER_RECIPES,
  MOCK_PRODUCTION_RUNS,
  MOCK_PURCHASE_RETURNS,
  MOCK_SUPPLIERS,
  previewProductionBatch,
  receiveMockPurchase,
  runProductionBatch,
  updateMockProduct,
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
  listStockMovements: (
    productId: string,
    query: { page: number; pageSize: number },
  ) => Promise<StockMovementListResponse>;
  uploadProductImage: (productId: string, file: File) => Promise<InventoryProductDetail>;
  restoreProduct: (id: string) => Promise<InventoryProductDetail>;
  bulkProductAction: (payload: {
    productIds: string[];
    status?: ProductStatus;
    category?: string;
    stockDelta?: number;
  }) => Promise<{ successCount: number; failedCount: number; message?: string }>;
  listSuppliers: (search?: string) => Promise<SupplierListResponse>;
  listPurchases: (search?: string) => Promise<PurchaseListResponse>;
  receivePurchase: (purchaseId: string) => Promise<import('@laam/types').PurchaseListItem>;
  listPurchaseReturns: () => Promise<PurchaseReturnListResponse>;
  listAdjustments: () => Promise<StockAdjustmentListResponse>;
  createAdjustment: (payload: CreateAdjustmentPayload) => Promise<void>;
  listMixerRecipes: () => Promise<MixerRecipeListResponse>;
  previewProduction: (payload: RunProductionBatchPayload) => Promise<ReturnType<typeof previewProductionBatch>>;
  runProduction: (payload: RunProductionBatchPayload) => Promise<ProductionBatchResult>;
  listProductionRuns: () => Promise<ProductionBatchListResponse>;
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
    async listSuppliers(search) {
      await delay(100);
      const q = search?.trim().toLowerCase() ?? '';
      const items = MOCK_SUPPLIERS.filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          (s.contactPerson?.toLowerCase().includes(q) ?? false),
      );
      return { items, total: items.length };
    },
    async listPurchases(search) {
      await delay(100);
      return filterMockPurchases(search);
    },
    async receivePurchase(purchaseId) {
      await delay(120);
      return receiveMockPurchase(purchaseId);
    },
    async listPurchaseReturns() {
      await delay(80);
      return { items: MOCK_PURCHASE_RETURNS, total: MOCK_PURCHASE_RETURNS.length };
    },
    async listAdjustments() {
      await delay(80);
      return { items: MOCK_ADJUSTMENTS, total: MOCK_ADJUSTMENTS.length };
    },
    async createAdjustment(payload) {
      await delay(100);
      createMockAdjustment(payload);
    },
    async listMixerRecipes() {
      await delay(80);
      return { items: MOCK_MIXER_RECIPES, total: MOCK_MIXER_RECIPES.length };
    },
    async previewProduction(payload) {
      await delay(40);
      return previewProductionBatch(payload);
    },
    async runProduction(payload) {
      await delay(150);
      return runProductionBatch(payload);
    },
    async listProductionRuns() {
      await delay(60);
      return { items: MOCK_PRODUCTION_RUNS, total: MOCK_PRODUCTION_RUNS.length };
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
    async listSuppliers(search) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      return apiRequest<SupplierListResponse>(`/crm/inventory/suppliers${params}`);
    },
    async listPurchases(search) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      return apiRequest<PurchaseListResponse>(`/crm/inventory/purchases${params}`);
    },
    async receivePurchase(purchaseId) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest(`/crm/inventory/purchases/${purchaseId}/receive`, { method: 'POST' });
    },
    async listPurchaseReturns() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<PurchaseReturnListResponse>('/crm/inventory/purchase-returns');
    },
    async listAdjustments() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<StockAdjustmentListResponse>('/crm/inventory/adjustments');
    },
    async createAdjustment(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      await apiRequest('/crm/inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async listMixerRecipes() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<MixerRecipeListResponse>('/crm/inventory/mixer');
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
    async listProductionRuns() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<ProductionBatchListResponse>('/crm/inventory/mixer/runs');
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const inventoryApi = useHttpApi ? createHttpInventoryApi() : createMockInventoryApi();
