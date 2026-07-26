import type {
  CarrybeeIntegrationSettings,
  CourierStatusMap,
  UpsertCarrybeeIntegrationPayload,
  UpsertCourierStatusMapPayload,
} from '@laam/types';

import { apiRequest } from '@/lib/api/client';

export type CarrybeeStoreOption = { id: string; name: string };

export const carrybeeSettingsApi = {
  get(): Promise<CarrybeeIntegrationSettings> {
    return apiRequest<CarrybeeIntegrationSettings>('/crm/settings/couriers/carrybee');
  },

  save(payload: UpsertCarrybeeIntegrationPayload): Promise<CarrybeeIntegrationSettings> {
    return apiRequest<CarrybeeIntegrationSettings>('/crm/settings/couriers/carrybee', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  disconnect(): Promise<CarrybeeIntegrationSettings> {
    return apiRequest<CarrybeeIntegrationSettings>('/crm/settings/couriers/carrybee', {
      method: 'DELETE',
    });
  },

  test(): Promise<{ ok: true; storeCount: number }> {
    return apiRequest('/crm/settings/couriers/carrybee/test', { method: 'POST' });
  },

  listStores(): Promise<CarrybeeStoreOption[]> {
    return apiRequest<CarrybeeStoreOption[]>('/crm/settings/couriers/carrybee/stores');
  },

  listStatusMaps(): Promise<CourierStatusMap[]> {
    return apiRequest<CourierStatusMap[]>('/crm/settings/couriers/carrybee/status-maps');
  },

  upsertStatusMap(payload: UpsertCourierStatusMapPayload): Promise<CourierStatusMap> {
    return apiRequest<CourierStatusMap>('/crm/settings/couriers/carrybee/status-maps', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
