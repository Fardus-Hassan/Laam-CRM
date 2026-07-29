import type {
  CreateWebsiteStorePayload,
  UpdateWebsiteStorePayload,
  WebsiteOrderIngestPayload,
  WebsiteOrderIngestResult,
  WebsiteStore,
} from '@laam/types';

import { apiRequest } from '@/lib/api/client';

export const websiteSettingsApi = {
  list(): Promise<WebsiteStore[]> {
    return apiRequest<WebsiteStore[]>('/crm/settings/websites');
  },

  get(id: string): Promise<WebsiteStore> {
    return apiRequest<WebsiteStore>(`/crm/settings/websites/${encodeURIComponent(id)}`);
  },

  create(payload: CreateWebsiteStorePayload): Promise<WebsiteStore> {
    return apiRequest<WebsiteStore>('/crm/settings/websites', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateWebsiteStorePayload): Promise<WebsiteStore> {
    return apiRequest<WebsiteStore>(`/crm/settings/websites/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  rotateToken(id: string): Promise<WebsiteStore> {
    return apiRequest<WebsiteStore>(
      `/crm/settings/websites/${encodeURIComponent(id)}/rotate-token`,
      { method: 'POST' },
    );
  },

  disconnect(id: string): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/crm/settings/websites/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

/** Docs helper — relative paths; base URL is the API host. */
export function websiteIngestPaths() {
  return {
    canonical: '/crm/integrations/website-orders',
    woocommerce: '/crm/integrations/website-orders/woocommerce',
  };
}

export type { WebsiteOrderIngestPayload, WebsiteOrderIngestResult };
