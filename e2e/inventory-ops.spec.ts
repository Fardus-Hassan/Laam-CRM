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

test.describe('Inventory purchase / return / mixer ops', () => {
  test('create purchase → create return → complete return → mixer preview', async ({ request }) => {
    const token = await login(request);
    const headers = authHeaders(token);
    const stamp = Date.now();

    const suppliersRes = await request.get(`${API}/crm/inventory/suppliers`, { headers });
    expect(suppliersRes.ok(), await suppliersRes.text()).toBeTruthy();
    const suppliers = await suppliersRes.json();
    const supplier = (suppliers.items as { id: string; status: string }[]).find(
      (s) => s.status === 'active',
    );
    expect(supplier, 'need an active supplier').toBeTruthy();

    const productsRes = await request.get(`${API}/crm/inventory/products?page=1&pageSize=20&filter=active`, {
      headers,
    });
    expect(productsRes.ok(), await productsRes.text()).toBeTruthy();
    const products = await productsRes.json();
    const productId = products.items[0]?.id as string;
    expect(productId).toBeTruthy();

    const detailRes = await request.get(`${API}/crm/inventory/products/${productId}`, { headers });
    expect(detailRes.ok(), await detailRes.text()).toBeTruthy();
    const detail = await detailRes.json();
    const variant = detail.variants?.[0];
    expect(variant?.id).toBeTruthy();

    const poNumber = `PO-E2E-${stamp}`;
    const createPurchaseRes = await request.post(`${API}/crm/inventory/purchases`, {
      headers,
      data: {
        supplierId: supplier!.id,
        purchaseNumber: poNumber,
        paymentStatus: 'unpaid',
        purchaseDate: '2026-07-19',
        notes: 'E2E purchase',
        lines: [
          {
            productId,
            variantId: variant.id,
            quantity: 3,
            unitCost: Number(variant.costPrice) || 100,
          },
        ],
      },
    });
    expect(createPurchaseRes.ok(), await createPurchaseRes.text()).toBeTruthy();
    const purchase = await createPurchaseRes.json();
    expect(purchase.purchaseNumber).toBe(poNumber);
    expect(purchase.stockStatus).toBe('pending');

    const receiveRes = await request.post(`${API}/crm/inventory/purchases/${purchase.id}/receive`, {
      headers,
    });
    expect(receiveRes.ok(), await receiveRes.text()).toBeTruthy();

    const returnNumber = `PR-E2E-${stamp}`;
    const createReturnRes = await request.post(`${API}/crm/inventory/purchase-returns`, {
      headers,
      data: {
        returnNumber,
        purchaseId: purchase.id,
        purchaseNumber: poNumber,
        supplierName: purchase.supplierName,
        returnDate: '2026-07-19',
        reason: 'E2E damaged unit',
        lines: [
          {
            productId,
            variantId: variant.id,
            quantity: 1,
            unitCost: Number(variant.costPrice) || 100,
          },
        ],
      },
    });
    expect(createReturnRes.ok(), await createReturnRes.text()).toBeTruthy();
    const purchaseReturn = await createReturnRes.json();
    expect(purchaseReturn.status).toBe('pending');

    const completeRes = await request.post(
      `${API}/crm/inventory/purchase-returns/${purchaseReturn.id}/complete`,
      { headers },
    );
    expect(completeRes.ok(), await completeRes.text()).toBeTruthy();

    const mixerRes = await request.get(`${API}/crm/inventory/mixer`, { headers });
    expect(mixerRes.ok(), await mixerRes.text()).toBeTruthy();
    const mixer = await mixerRes.json();
    expect(mixer.total).toBeGreaterThan(0);
    expect(mixer.items[0].outputProductId).toBeTruthy();

    const raw = (products.items as { id: string; sku: string }[]).find(
      (p) => p.sku === 'SEED-RAW-HONEY',
    );
    const honey = (products.items as { id: string; sku: string }[]).find(
      (p) => p.sku === 'SEED-HONEY-001',
    );
    if (raw && honey) {
      const honeyDetailRes = await request.get(`${API}/crm/inventory/products/${honey.id}`, {
        headers,
      });
      const honeyDetail = await honeyDetailRes.json();
      const outVariant = honeyDetail.variants?.[0];
      expect(outVariant?.id).toBeTruthy();

      const previewRes = await request.post(`${API}/crm/inventory/mixer/preview`, {
        headers,
        data: {
          outputProductId: honey.id,
          rawMaterials: [
            {
              productId: raw.id,
              name: 'Raw Honey Drum',
              quantity: 1,
              unit: 'kg',
              totalCost: 280,
              costPerKg: 280,
            },
          ],
          outputs: [
            {
              variantId: outVariant.id,
              variantLabel: outVariant.label,
              gramsPerUnit: 500,
              units: 2,
            },
          ],
        },
      });
      expect(previewRes.ok(), await previewRes.text()).toBeTruthy();
      const preview = await previewRes.json();
      expect(preview.ok).toBeTruthy();
      expect(preview.unitsProduced).toBe(2);
    }
  });
});
