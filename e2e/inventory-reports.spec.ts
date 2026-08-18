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

async function ensureProduct(
  request: APIRequestContext,
  headers: Record<string, string>,
  input: { sku: string; name: string; salePrice: number; costPrice: number; stock: number },
): Promise<{ id: string; sku: string }> {
  const listRes = await request.get(
    `${API}/crm/inventory/products?page=1&pageSize=100&search=${encodeURIComponent(input.sku)}`,
    { headers },
  );
  expect(listRes.ok(), await listRes.text()).toBeTruthy();
  const listBody = await listRes.json();
  const existing = (listBody.items as { id: string; sku: string }[]).find((p) => p.sku === input.sku);
  if (existing) return existing;

  const createRes = await request.post(`${API}/crm/inventory/products`, {
    headers,
    data: {
      name: input.name,
      sku: input.sku,
      status: 'active',
      reorderLevel: 2,
      variants: [
        {
          label: 'Standard',
          sku: `${input.sku}-STD`,
          salePrice: input.salePrice,
          costPrice: input.costPrice,
          stock: input.stock,
          reorderLevel: 2,
        },
      ],
    },
  });
  expect(createRes.ok(), await createRes.text()).toBeTruthy();
  const created = await createRes.json();
  return { id: created.id as string, sku: created.sku as string };
}

test.describe('Inventory reports', () => {
  test('GET /crm/inventory/reports returns composite dashboard', async ({ request }) => {
    const token = await login(request);
    const res = await request.get(`${API}/crm/inventory/reports`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-Slug': TENANT,
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.generatedAt).toBeTruthy();
    expect(body.summary).toMatchObject({
      skuCount: expect.any(Number),
      totalStockUnits: expect.any(Number),
      inventoryValuationAtCost: expect.any(Number),
      lowStockCount: expect.any(Number),
      pendingPurchases: expect.any(Number),
      pendingReturns: expect.any(Number),
    });
    expect(Array.isArray(body.lowStock)).toBeTruthy();
    expect(Array.isArray(body.recent.purchases)).toBeTruthy();
    expect(Array.isArray(body.recent.returns)).toBeTruthy();
    expect(Array.isArray(body.recent.production)).toBeTruthy();
    expect(Array.isArray(body.recent.movements)).toBeTruthy();
    expect(Array.isArray(body.valuationBreakdown.categories)).toBeTruthy();
    expect(Array.isArray(body.valuationBreakdown.brands)).toBeTruthy();
    expect(body.summary.skuCount).toBeGreaterThan(0);
  });

  test('GET /crm/inventory/reports supports date range filter', async ({ request }) => {
    const token = await login(request);
    const res = await request.get(
      `${API}/crm/inventory/reports?dateFrom=2020-01-01&dateTo=2099-12-31`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Slug': TENANT,
        },
      },
    );
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.period).toMatchObject({
      dateFrom: '2020-01-01',
      dateTo: '2099-12-31',
    });
    expect(Array.isArray(body.recent.movements)).toBeTruthy();
  });

  test('GET /crm/inventory/purchase-returns/:id returns detail lines', async ({ request }) => {
    const token = await login(request);
    const headers = {
      Authorization: `Bearer ${token}`,
      'X-Tenant-Slug': TENANT,
      'Content-Type': 'application/json',
    };

    const honey = await ensureProduct(request, headers, {
      sku: `E2E-REP-HONEY-${Date.now()}`,
      name: 'E2E Reports Honey',
      salePrice: 510,
      costPrice: 330,
      stock: 12,
    });

    const productDetailRes = await request.get(`${API}/crm/inventory/products/${honey!.id}`, {
      headers,
    });
    expect(productDetailRes.ok(), await productDetailRes.text()).toBeTruthy();
    const productDetail = await productDetailRes.json();
    const variant = productDetail.variants[0];
    expect(variant).toBeTruthy();

    const stamp = Date.now();
    const createRes = await request.post(`${API}/crm/inventory/purchase-returns`, {
      headers,
      data: {
        returnNumber: `PR-DET-${stamp}`,
        purchaseNumber: `PO-DET-${stamp}`,
        supplierName: 'E2E Detail Supplier',
        returnDate: '2026-07-19',
        reason: 'Detail page E2E',
        lines: [
          {
            productId: honey!.id,
            variantId: variant.id,
            quantity: 1,
            unitCost: Number(variant.costPrice) || 100,
          },
        ],
      },
    });
    expect(createRes.ok(), await createRes.text()).toBeTruthy();
    const created = await createRes.json();

    const detailRes = await request.get(`${API}/crm/inventory/purchase-returns/${created.id}`, {
      headers,
    });
    expect(detailRes.ok(), await detailRes.text()).toBeTruthy();
    const detail = await detailRes.json();
    expect(detail.returnNumber).toBe(`PR-DET-${stamp}`);
    expect(Array.isArray(detail.lines)).toBeTruthy();
    expect(detail.lines.length).toBeGreaterThan(0);
    expect(detail.lines[0].productName).toBeTruthy();
  });
});
