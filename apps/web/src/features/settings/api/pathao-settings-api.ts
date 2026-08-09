import type {
  CourierStatusMap,
  PathaoIntegrationSettings,
  UpsertCourierStatusMapPayload,
  UpsertPathaoIntegrationPayload,
} from '@laam/types';

import { apiRequest } from '@/lib/api/client';

export type PathaoStoreOption = { id: number; name: string };

export const pathaoSettingsApi = {
  get(): Promise<PathaoIntegrationSettings> {
    return apiRequest<PathaoIntegrationSettings>('/crm/settings/couriers/pathao');
  },

  save(payload: UpsertPathaoIntegrationPayload): Promise<PathaoIntegrationSettings> {
    return apiRequest<PathaoIntegrationSettings>('/crm/settings/couriers/pathao', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  disconnect(): Promise<PathaoIntegrationSettings> {
    return apiRequest<PathaoIntegrationSettings>('/crm/settings/couriers/pathao', {
      method: 'DELETE',
    });
  },

  test(): Promise<{ ok: true; storeCount: number }> {
    return apiRequest('/crm/settings/couriers/pathao/test', { method: 'POST' });
  },

  listStores(): Promise<PathaoStoreOption[]> {
    return apiRequest<PathaoStoreOption[]>('/crm/settings/couriers/pathao/stores');
  },

  listStatusMaps(): Promise<CourierStatusMap[]> {
    return apiRequest<CourierStatusMap[]>('/crm/settings/couriers/pathao/status-maps');
  },

  upsertStatusMap(payload: UpsertCourierStatusMapPayload): Promise<CourierStatusMap> {
    return apiRequest<CourierStatusMap>('/crm/settings/couriers/pathao/status-maps', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
