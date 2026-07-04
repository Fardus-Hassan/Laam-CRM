import type { IntegrationConfig, OrgProfile, OrgSettings, UpdateIntegrationPayload, UpdateOrgProfilePayload } from '@laam/types';

export const MOCK_ORG_PROFILE: OrgProfile = {
  name: 'Modhu House BD',
  slug: 'modhu-house',
  email: 'hello@modhuhouse.com',
  phone: '01700000000',
  address: '12 Mirpur Road, Block C',
  district: 'Dhaka',
  logoUrl: undefined,
  website: 'https://modhuhouse.com',
  timezone: 'Asia/Dhaka',
  currency: 'BDT',
  orderPrefix: 'MH',
  defaultCourier: 'steadfast',
};

export const MOCK_INTEGRATIONS: IntegrationConfig[] = [
  { id: 'int-1', provider: 'steadfast', label: 'Steadfast Courier', status: 'connected', lastSyncAt: '2026-07-02T08:00:00Z' },
  { id: 'int-2', provider: 'pathao', label: 'Pathao Courier', status: 'connected', lastSyncAt: '2026-07-01T22:00:00Z' },
  { id: 'int-3', provider: 'redx', label: 'RedX Courier', status: 'disconnected' },
  { id: 'int-4', provider: 'facebook', label: 'Facebook Lead Ads', status: 'connected', lastSyncAt: '2026-07-02T06:30:00Z' },
  { id: 'int-5', provider: 'bkash', label: 'bKash Payment', status: 'connected', lastSyncAt: '2026-07-02T10:00:00Z' },
  { id: 'int-6', provider: 'nagad', label: 'Nagad Payment', status: 'pending' },
  { id: 'int-7', provider: 'smtp', label: 'Email (SMTP)', status: 'error', errorMessage: 'Authentication failed — check password' },
  { id: 'int-8', provider: 'woocommerce', label: 'WooCommerce Sync', status: 'disconnected' },
];

let profileStore = { ...MOCK_ORG_PROFILE };
let integrationsStore = [...MOCK_INTEGRATIONS];

export function getOrgSettings(): OrgSettings {
  return {
    profile: { ...profileStore },
    integrations: [...integrationsStore],
  };
}

export function updateOrgProfile(payload: UpdateOrgProfilePayload): OrgProfile {
  profileStore = { ...profileStore, ...payload };
  return { ...profileStore };
}

export function updateIntegration(payload: UpdateIntegrationPayload): IntegrationConfig {
  const idx = integrationsStore.findIndex((i) => i.provider === payload.provider);
  if (idx >= 0) {
    integrationsStore[idx] = {
      ...integrationsStore[idx],
      status: 'connected',
      lastSyncAt: new Date().toISOString(),
      config: payload.config,
      errorMessage: undefined,
    };
    return { ...integrationsStore[idx] };
  }
  throw new Error('Integration not found');
}

export function disconnectIntegration(provider: string): IntegrationConfig {
  const idx = integrationsStore.findIndex((i) => i.provider === provider);
  if (idx >= 0) {
    integrationsStore[idx] = { ...integrationsStore[idx], status: 'disconnected', config: undefined, lastSyncAt: undefined };
    return { ...integrationsStore[idx] };
  }
  throw new Error('Integration not found');
}
