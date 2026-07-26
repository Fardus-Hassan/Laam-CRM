import type { OrderDetail } from '@laam/types';

export type CarrybeePlace = {
  id: string;
  name: string;
};

export const carrybeeCourierApi = {
  async listCities(): Promise<CarrybeePlace[]> {
    const { apiRequest } = await import('@/lib/api/client');
    return apiRequest<CarrybeePlace[]>('/crm/couriers/carrybee/cities');
  },

  async listZones(cityId: string): Promise<CarrybeePlace[]> {
    const { apiRequest } = await import('@/lib/api/client');
    return apiRequest<CarrybeePlace[]>(
      `/crm/couriers/carrybee/cities/${encodeURIComponent(cityId)}/zones`,
    );
  },

  async listAreas(cityId: string, zoneId: string): Promise<CarrybeePlace[]> {
    const { apiRequest } = await import('@/lib/api/client');
    return apiRequest<CarrybeePlace[]>(
      `/crm/couriers/carrybee/cities/${encodeURIComponent(cityId)}/zones/${encodeURIComponent(zoneId)}/areas`,
    );
  },

  async bookOrder(orderId: string): Promise<OrderDetail> {
    const { apiRequest } = await import('@/lib/api/client');
    return apiRequest<OrderDetail>(
      `/crm/orders/${encodeURIComponent(orderId)}/courier/carrybee/book`,
      { method: 'POST' },
    );
  },

  async syncOrder(orderId: string): Promise<OrderDetail> {
    const { apiRequest } = await import('@/lib/api/client');
    return apiRequest<OrderDetail>(
      `/crm/orders/${encodeURIComponent(orderId)}/courier/carrybee/sync`,
      { method: 'POST' },
    );
  },
};
