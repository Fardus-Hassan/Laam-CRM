import type { CampaignOverview } from '@laam/types';

import { getCampaignOverview } from '@/features/campaigns/data/mock-campaigns';
import { apiRequest } from '@/lib/api/client';

export type CampaignsApi = {
  getOverview: () => Promise<CampaignOverview>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockCampaignsApi(): CampaignsApi {
  return {
    async getOverview() {
      await delay(100);
      return getCampaignOverview();
    },
  };
}

export function createHttpCampaignsApi(): CampaignsApi {
  return {
    getOverview: () => apiRequest('/crm/campaigns/overview'),
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const campaignsApi = useHttpApi ? createHttpCampaignsApi() : createMockCampaignsApi();
