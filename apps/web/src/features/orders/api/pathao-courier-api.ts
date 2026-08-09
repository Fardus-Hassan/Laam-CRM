import type { OrderDetail } from '@laam/types';

export type PathaoPlace = {
  id: string;
  name: string;
};

export const pathaoCourierApi = {
  async listCities(): Promise<PathaoPlace[]> {
    const { apiRequest } = await import('@/lib/api/client');
    return apiRequest<PathaoPlace[]>('/crm/couriers/pathao/cities');
  },

  async listZones(cityId: string): Promise<PathaoPlace[]> {
    const { apiRequest } = await import('@/lib/api/client');
    return apiRequest<PathaoPlace[]>(
      `/crm/couriers/pathao/cities/${encodeURIComponent(cityId)}/zones`,
    );
  },

  async listAreas(zoneId: string): Promise<PathaoPlace[]> {
    const { apiRequest } = await import('@/lib/api/client');
    return apiRequest<PathaoPlace[]>(
      `/crm/couriers/pathao/zones/${encodeURIComponent(zoneId)}/areas`,
    );
  },

  async bookOrder(orderId: string): Promise<OrderDetail> {
    const { apiRequest } = await import('@/lib/api/client');
    return apiRequest<OrderDetail>(
      `/crm/orders/${encodeURIComponent(orderId)}/courier/pathao/book`,
      { method: 'POST' },
    );
  },

  async syncOrder(orderId: string): Promise<OrderDetail> {
    const { apiRequest } = await import('@/lib/api/client');
    return apiRequest<OrderDetail>(
      `/crm/orders/${encodeURIComponent(orderId)}/courier/pathao/sync`,
      { method: 'POST' },
    );
  },
};
