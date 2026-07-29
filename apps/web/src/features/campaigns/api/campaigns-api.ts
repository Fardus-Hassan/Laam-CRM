import type {
  Campaign,
  CampaignOverview,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from '@laam/types';

import { getCampaignOverview } from '@/features/campaigns/data/mock-campaigns';
import { apiRequest } from '@/lib/api/client';

export type CampaignsApi = {
  getOverview: () => Promise<CampaignOverview>;
  listCampaigns: () => Promise<Campaign[]>;
  createCampaign: (payload: CreateCampaignPayload) => Promise<Campaign>;
  updateCampaign: (id: string, patch: UpdateCampaignPayload) => Promise<Campaign>;
  deleteCampaign: (id: string) => Promise<void>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let mockStore: CampaignOverview | null = null;

function ensureMock(): CampaignOverview {
  if (!mockStore) mockStore = getCampaignOverview();
  return mockStore;
}

export function createMockCampaignsApi(): CampaignsApi {
  return {
    async getOverview() {
      await delay(100);
      return ensureMock();
    },
    async listCampaigns() {
      await delay(80);
      return ensureMock().campaigns;
    },
    async createCampaign(payload) {
      await delay(120);
      const overview = ensureMock();
      const campaign: Campaign = {
        id: `camp-${Date.now()}`,
        name: payload.name.trim(),
        status: payload.status ?? 'active',
        platform: payload.platform ?? 'facebook',
        spendBdt: 0,
        budgetBdt: payload.budgetBdt ?? 0,
        leads: 0,
        orders: 0,
        revenueBdt: 0,
        roas: 0,
        startDate: payload.startDate ?? new Date().toISOString().slice(0, 10),
        endDate: payload.endDate ?? undefined,
        notes: payload.notes ?? undefined,
        landingPageName: payload.landingPageName ?? undefined,
        landingPageUrl: payload.landingPageUrl ?? undefined,
      };
      overview.campaigns = [campaign, ...overview.campaigns];
      return campaign;
    },
    async updateCampaign(id, patch) {
      await delay(100);
      const overview = ensureMock();
      const idx = overview.campaigns.findIndex((c) => c.id === id);
      if (idx < 0) throw new Error('Campaign not found');
      const current = overview.campaigns[idx]!;
      const updated: Campaign = {
        ...current,
        ...patch,
        name: patch.name?.trim() ?? current.name,
        endDate: patch.endDate === null ? undefined : (patch.endDate ?? current.endDate),
        notes: patch.notes === null ? undefined : (patch.notes ?? current.notes),
        landingPageName:
          patch.landingPageName === null
            ? undefined
            : (patch.landingPageName ?? current.landingPageName),
        landingPageUrl:
          patch.landingPageUrl === null
            ? undefined
            : (patch.landingPageUrl ?? current.landingPageUrl),
      };
      overview.campaigns[idx] = updated;
      return updated;
    },
    async deleteCampaign(id) {
      await delay(80);
      const overview = ensureMock();
      overview.campaigns = overview.campaigns.filter((c) => c.id !== id);
    },
  };
}

export function createHttpCampaignsApi(): CampaignsApi {
  return {
    getOverview: () => apiRequest<CampaignOverview>('/crm/campaigns/overview'),
    listCampaigns: () => apiRequest<Campaign[]>('/crm/campaigns'),
    createCampaign: (payload) =>
      apiRequest<Campaign>('/crm/campaigns', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateCampaign: (id, patch) =>
      apiRequest<Campaign>(`/crm/campaigns/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    deleteCampaign: async (id) => {
      await apiRequest(`/crm/campaigns/${id}`, { method: 'DELETE' });
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const campaignsApi = useHttpApi ? createHttpCampaignsApi() : createMockCampaignsApi();
