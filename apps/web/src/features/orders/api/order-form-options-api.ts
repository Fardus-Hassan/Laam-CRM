import type { OrderFormOption } from '@laam/types';

export type OrderFormOptionRow = {
  id: string;
  organizationId: string;
  kind: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const orderFormOptionsApi = {
  async list(kind?: string): Promise<OrderFormOptionRow[]> {
    const { apiRequest } = await import('@/lib/api/client');
    const { crmEndpoints } = await import('@/lib/api/endpoints');
    const suffix = kind ? `?kind=${encodeURIComponent(kind)}` : '';
    return apiRequest<OrderFormOptionRow[]>(
      `${crmEndpoints.orders}/meta/form-options/manage${suffix}`,
    );
  },

  async create(payload: {
    kind: string;
    value: string;
    label: string;
    sortOrder?: number;
  }): Promise<OrderFormOptionRow> {
    const { apiRequest } = await import('@/lib/api/client');
    const { crmEndpoints } = await import('@/lib/api/endpoints');
    return apiRequest<OrderFormOptionRow>(`${crmEndpoints.orders}/meta/form-options`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(
    id: string,
    payload: { label?: string; value?: string; sortOrder?: number; isActive?: boolean },
  ): Promise<OrderFormOptionRow> {
    const { apiRequest } = await import('@/lib/api/client');
    const { crmEndpoints } = await import('@/lib/api/endpoints');
    return apiRequest<OrderFormOptionRow>(`${crmEndpoints.orders}/meta/form-options/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async remove(id: string): Promise<void> {
    const { apiRequest } = await import('@/lib/api/client');
    const { crmEndpoints } = await import('@/lib/api/endpoints');
    await apiRequest(`${crmEndpoints.orders}/meta/form-options/${id}`, {
      method: 'DELETE',
    });
  },
};

// Keep type import used for docs / future
export type { OrderFormOption };
