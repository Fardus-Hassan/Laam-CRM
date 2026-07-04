import type {
  IntegrationConfig,
  OrgProfile,
  OrgSettings,
  UpdateIntegrationPayload,
  UpdateOrgProfilePayload,
} from '@laam/types';

import {
  disconnectIntegration,
  getOrgSettings,
  updateIntegration,
  updateOrgProfile,
} from '@/features/settings/data/mock-org-settings';
import { apiRequest } from '@/lib/api/client';

export type OrgSettingsApi = {
  getSettings: () => Promise<OrgSettings>;
  updateProfile: (payload: UpdateOrgProfilePayload) => Promise<OrgProfile>;
  updateIntegration: (payload: UpdateIntegrationPayload) => Promise<IntegrationConfig>;
  disconnectIntegration: (provider: string) => Promise<IntegrationConfig>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockOrgSettingsApi(): OrgSettingsApi {
  return {
    async getSettings() {
      await delay(100);
      return getOrgSettings();
    },
    async updateProfile(payload) {
      await delay(150);
      return updateOrgProfile(payload);
    },
    async updateIntegration(payload) {
      await delay(150);
      return updateIntegration(payload);
    },
    async disconnectIntegration(provider) {
      await delay(100);
      return disconnectIntegration(provider);
    },
  };
}

export function createHttpOrgSettingsApi(): OrgSettingsApi {
  return {
    getSettings: () => apiRequest<OrgSettings>('/crm/settings'),
    updateProfile: (payload) =>
      apiRequest<OrgProfile>('/crm/settings/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
    updateIntegration: (payload) =>
      apiRequest<IntegrationConfig>('/crm/settings/integrations', { method: 'PUT', body: JSON.stringify(payload) }),
    disconnectIntegration: (provider) =>
      apiRequest<IntegrationConfig>(`/crm/settings/integrations/${provider}`, { method: 'DELETE' }),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const orgSettingsApi = useHttpApi ? createHttpOrgSettingsApi() : createMockOrgSettingsApi();
