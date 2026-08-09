import type { PublicTenantBrand, UpdateOrganizationBranding } from '@laam/types';

import { env } from '@/config/env';
import { apiRequest } from '@/lib/api/client';
import { getStoredAccessToken } from '@/lib/auth-token';

export type BrandingApiClient = {
  get(): Promise<PublicTenantBrand>;
  update(patch: UpdateOrganizationBranding): Promise<PublicTenantBrand>;
  uploadLogo(
    variant: 'light' | 'dark' | 'favicon',
    file: File,
  ): Promise<PublicTenantBrand>;
};

async function postLogo(
  path: string,
  variant: 'light' | 'dark' | 'favicon',
  file: File,
) {
  const form = new FormData();
  form.append('variant', variant);
  form.append('file', file);

  const token = getStoredAccessToken();
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${env.apiUrl}${path}`, {
    method: 'POST',
    headers,
    body: form,
    credentials: 'include',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Logo upload failed');
  }

  return response.json() as Promise<PublicTenantBrand>;
}

function createBrandingClient(basePath: string): BrandingApiClient {
  return {
    get() {
      return apiRequest<PublicTenantBrand>(basePath);
    },
    update(patch) {
      return apiRequest<PublicTenantBrand>(basePath, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },
    uploadLogo(variant, file) {
      return postLogo(`${basePath}/logo`, variant, file);
    },
  };
}

const brandingPath = '/crm/settings/branding';

export const brandingApi = createBrandingClient(brandingPath);

export const platformBrandingApi = createBrandingClient('/platform/branding');

export function tenantBrandingApi(tenantId: string): BrandingApiClient {
  return createBrandingClient(`/platform/tenants/${tenantId}/branding`);
}
