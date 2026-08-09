import type {
  AutomationSettings,
  UpsertAutomationSettingsPayload,
} from '@laam/types';

import { apiRequest } from '@/lib/api/client';

export type AutomationsApi = {
  getSettings: () => Promise<AutomationSettings>;
  saveSettings: (payload: UpsertAutomationSettingsPayload) => Promise<AutomationSettings>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let mockSettings: AutomationSettings = {
  autoSmsOnStatusChange: true,
  statusSmsMap: { confirmed: 'confirm', delivered: 'delivered' },
  autoFollowupOnStatusChange: true,
  statusFollowupMap: {
    pending: { queue: 1, delayDays: 0, note: 'Call to confirm' },
    hold: { queue: 2, delayDays: 1 },
  },
  smsEnabled: false,
  updatedAt: new Date().toISOString(),
};

export function createMockAutomationsApi(): AutomationsApi {
  return {
    async getSettings() {
      await delay(80);
      return { ...mockSettings, statusSmsMap: { ...mockSettings.statusSmsMap }, statusFollowupMap: { ...mockSettings.statusFollowupMap } };
    },
    async saveSettings(payload) {
      await delay(100);
      mockSettings = {
        ...mockSettings,
        ...payload,
        statusSmsMap: payload.statusSmsMap ?? mockSettings.statusSmsMap,
        statusFollowupMap: payload.statusFollowupMap ?? mockSettings.statusFollowupMap,
        updatedAt: new Date().toISOString(),
      };
      return mockSettings;
    },
  };
}

export function createHttpAutomationsApi(): AutomationsApi {
  return {
    getSettings: () => apiRequest<AutomationSettings>('/crm/settings/automations'),
    saveSettings: (payload) =>
      apiRequest<AutomationSettings>('/crm/settings/automations', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const automationsApi = useHttpApi
  ? createHttpAutomationsApi()
  : createMockAutomationsApi();
