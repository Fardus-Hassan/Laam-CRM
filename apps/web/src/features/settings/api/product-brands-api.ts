import type {
  CreateProductBrandPayload,
  ProductBrand,
  UpdateProductBrandPayload,
} from '@laam/types';

import { apiRequest } from '@/lib/api/client';

let mockBrands: ProductBrand[] = [];

export type ProductBrandsApi = {
  list: () => Promise<ProductBrand[]>;
  create: (payload: CreateProductBrandPayload) => Promise<ProductBrand>;
  update: (id: string, payload: UpdateProductBrandPayload) => Promise<ProductBrand>;
  remove: (id: string) => Promise<void>;
};

function slugify(input: string) {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 64) || 'brand'
  );
}

export function createMockProductBrandsApi(): ProductBrandsApi {
  return {
    async list() {
      return [...mockBrands];
    },
    async create(payload) {
      const now = new Date().toISOString();
      const brand: ProductBrand = {
        id: `brand-${Date.now()}`,
        organizationId: 'mock',
        name: payload.name.trim(),
        slug: payload.slug ? slugify(payload.slug) : slugify(payload.name),
        description: payload.description,
        isActive: payload.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };
      mockBrands = [...mockBrands, brand];
      return brand;
    },
    async update(id, payload) {
      const idx = mockBrands.findIndex((b) => b.id === id);
      if (idx < 0) throw new Error('Brand not found');
      const current = mockBrands[idx]!;
      const next: ProductBrand = {
        ...current,
        ...payload,
        name: payload.name?.trim() ?? current.name,
        slug: payload.slug ? slugify(payload.slug) : current.slug,
        updatedAt: new Date().toISOString(),
      };
      mockBrands = mockBrands.map((b) => (b.id === id ? next : b));
      return next;
    },
    async remove(id) {
      mockBrands = mockBrands.filter((b) => b.id !== id);
    },
  };
}

export function createHttpProductBrandsApi(): ProductBrandsApi {
  return {
    async list() {
      return apiRequest<ProductBrand[]>('/crm/inventory/brands');
    },
    async create(payload) {
      return apiRequest<ProductBrand>('/crm/inventory/brands', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async update(id, payload) {
      return apiRequest<ProductBrand>(`/crm/inventory/brands/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    async remove(id) {
      await apiRequest(`/crm/inventory/brands/${id}`, { method: 'DELETE' });
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const productBrandsApi = useHttpApi
  ? createHttpProductBrandsApi()
  : createMockProductBrandsApi();
