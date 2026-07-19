import { expect, test, type APIRequestContext } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:3333/api';
const EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e.admin@laam.test';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'e2e.admin2026';
const DEVICE_ID = process.env.E2E_DEVICE_ID ?? 'e2e-device';
const TENANT = process.env.E2E_TENANT_SLUG ?? 'laam';

async function login(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: EMAIL, password: PASSWORD, deviceId: DEVICE_ID },
    headers: { 'X-Tenant-Slug': TENANT },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()).accessToken as string;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'X-Tenant-Slug': TENANT,
  };
}

test.describe('Inventory advanced', () => {
  test('GET /crm/inventory/stock-movements returns paginated ledger', async ({ request }) => {
    const token = await login(request);
    const res = await request.get(`${API}/crm/inventory/stock-movements?page=1&pageSize=10`, {
      headers: authHeaders(token),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.items)).toBeTruthy();
    expect(body).toMatchObject({
      total: expect.any(Number),
      page: 1,
      pageSize: 10,
    });
    for (const item of body.items as Record<string, unknown>[]) {
      expect(item.id).toBeTruthy();
      expect(item.reason).toBeTruthy();
      expect(typeof item.delta).toBe('number');
      expect(item.createdAt).toBeTruthy();
    }
  });

  test('GET /crm/inventory/stock-movements supports direction filter', async ({ request }) => {
    const token = await login(request);
    const res = await request.get(
      `${API}/crm/inventory/stock-movements?page=1&pageSize=20&direction=in`,
      { headers: authHeaders(token) },
    );
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    for (const item of body.items as { delta: number }[]) {
      expect(item.delta).toBeGreaterThan(0);
    }
  });

  test('GET /crm/inventory/warehouses includes default MAIN warehouse', async ({ request }) => {
    const token = await login(request);
    const res = await request.get(`${API}/crm/inventory/warehouses`, {
      headers: authHeaders(token),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.items)).toBeTruthy();
    expect(body.items.length).toBeGreaterThan(0);
    const main = (body.items as { code: string; isDefault: boolean; isActive: boolean }[]).find(
      (w) => w.code === 'MAIN',
    );
    expect(main, 'MAIN warehouse required').toBeTruthy();
    expect(main!.isActive).toBeTruthy();
  });

  test('GET /crm/inventory/reconciliation returns valuation vs GL shape', async ({ request }) => {
    const token = await login(request);
    const res = await request.get(`${API}/crm/inventory/reconciliation`, {
      headers: authHeaders(token),
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.generatedAt).toBeTruthy();
    expect(typeof body.inventoryValuationAtCost).toBe('number');
    expect(typeof body.inventoryGlBalance).toBe('number');
    expect(typeof body.difference).toBe('number');
    expect(typeof body.isBalanced).toBe('boolean');
    expect(Array.isArray(body.accounts)).toBeTruthy();
    expect(Array.isArray(body.recentJournals)).toBeTruthy();
    expect(Array.isArray(body.expiringLots)).toBeTruthy();
  });

  test('GET /crm/inventory/lots lists lots with optional expiry window', async ({ request }) => {
    const token = await login(request);

    const allRes = await request.get(`${API}/crm/inventory/lots`, {
      headers: authHeaders(token),
    });
    expect(allRes.ok(), await allRes.text()).toBeTruthy();
    const all = await allRes.json();
    expect(Array.isArray(all.items)).toBeTruthy();
    expect(typeof all.total).toBe('number');

    const expiringRes = await request.get(`${API}/crm/inventory/lots?expiringWithinDays=60`, {
      headers: authHeaders(token),
    });
    expect(expiringRes.ok(), await expiringRes.text()).toBeTruthy();
    const expiring = await expiringRes.json();
    expect(Array.isArray(expiring.items)).toBeTruthy();
    for (const lot of expiring.items as { expiresAt?: string; lotNumber: string }[]) {
      expect(lot.lotNumber).toBeTruthy();
      expect(lot.expiresAt).toBeTruthy();
    }
  });
});
