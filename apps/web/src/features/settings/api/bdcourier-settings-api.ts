import type {
  BdCourierIntegrationSettings,
  BdCourierPlan,
  UpsertBdCourierIntegrationPayload,
} from '@laam/types';

import { apiRequest } from '@/lib/api/client';

export const bdCourierSettingsApi = {
  get(): Promise<BdCourierIntegrationSettings> {
    return apiRequest<BdCourierIntegrationSettings>('/crm/settings/couriers/bdcourier');
  },

  save(payload: UpsertBdCourierIntegrationPayload): Promise<BdCourierIntegrationSettings> {
    return apiRequest<BdCourierIntegrationSettings>('/crm/settings/couriers/bdcourier', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  disconnect(): Promise<BdCourierIntegrationSettings> {
    return apiRequest<BdCourierIntegrationSettings>('/crm/settings/couriers/bdcourier', {
      method: 'DELETE',
    });
  },

  test(): Promise<{ ok: true; message: string }> {
    return apiRequest('/crm/settings/couriers/bdcourier/test', { method: 'POST' });
  },

  plan(): Promise<BdCourierPlan> {
    return apiRequest<BdCourierPlan>('/crm/settings/couriers/bdcourier/plan');
  },
};
