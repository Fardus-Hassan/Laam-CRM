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
  const body = await res.json();
  expect(body.accessToken, JSON.stringify(body)).toBeTruthy();
  return body.accessToken as string;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'X-Tenant-Slug': TENANT,
    'Content-Type': 'application/json',
  };
}

test.describe('Catalog recycle lifecycle', () => {
  test('create → archive → recycle list → restore → archive → purge', async ({ request }) => {
    const token = await login(request);
    const headers = authHeaders(token);
    const sku = `E2E-${Date.now()}`;

    const createRes = await request.post(`${API}/crm/inventory/products`, {
      headers,
      data: {
        name: 'E2E Lifecycle Honey',
        sku,
        category: 'honey',
        status: 'active',
        reorderLevel: 5,
        variants: [
          {
            label: '500g',
            sku: `${sku}-500G`,
            salePrice: 499,
            costPrice: 300,
            stock: 10,
            reorderLevel: 5,
          },
        ],
      },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const product = await createRes.json();
    expect(product.id).toBeTruthy();

    const archiveRes = await request.delete(`${API}/crm/inventory/products/${product.id}`, {
      headers,
    });
    expect(archiveRes.ok(), await archiveRes.text()).toBeTruthy();

    const listRes = await request.get(`${API}/crm/recycle-bin?entityType=product`, { headers });
    expect(listRes.ok(), await listRes.text()).toBeTruthy();
    const items = await listRes.json();
    const recycleItem = items.find(
      (item: { entityId: string; id: string }) => item.entityId === product.id,
    );
    expect(recycleItem, JSON.stringify(items)).toBeTruthy();

    const restoreRes = await request.post(
      `${API}/crm/recycle-bin/${encodeURIComponent(recycleItem.id)}/restore`,
      { headers },
    );
    expect(restoreRes.ok(), await restoreRes.text()).toBeTruthy();

    const getRes = await request.get(`${API}/crm/inventory/products/${product.id}`, { headers });
    expect(getRes.ok(), await getRes.text()).toBeTruthy();
    const restored = await getRes.json();
    expect(restored.deletedAt).toBeFalsy();

    const archiveAgain = await request.delete(`${API}/crm/inventory/products/${product.id}`, {
      headers,
    });
    expect(archiveAgain.ok(), await archiveAgain.text()).toBeTruthy();

    const purgeRes = await request.delete(
      `${API}/crm/recycle-bin/${encodeURIComponent(recycleItem.id)}`,
      { headers },
    );
    expect(purgeRes.ok(), await purgeRes.text()).toBeTruthy();

    const gone = await request.get(
      `${API}/crm/inventory/products/${product.id}?includeDeleted=true`,
      { headers },
    );
    expect(gone.status()).toBe(404);
  });
});
