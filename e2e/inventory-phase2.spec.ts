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
  return body.accessToken as string;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'X-Tenant-Slug': TENANT,
    'Content-Type': 'application/json',
  };
}

test.describe('Inventory Phase 2 — suppliers & purchase management', () => {
  test('supplier CRUD + purchase detail/payment/cancel', async ({ request }) => {
    const token = await login(request);
    const headers = authHeaders(token);
    const stamp = Date.now();

    const createSupplierRes = await request.post(`${API}/crm/inventory/suppliers`, {
      headers,
      data: {
        name: `E2E Supplier ${stamp}`,
        phone: '01719990000',
        contactPerson: 'E2E Contact',
        status: 'active',
      },
    });
    expect(createSupplierRes.ok(), await createSupplierRes.text()).toBeTruthy();
    const supplier = await createSupplierRes.json();

    const updateSupplierRes = await request.patch(`${API}/crm/inventory/suppliers/${supplier.id}`, {
      headers,
      data: { address: 'Dhaka Test Road', status: 'active' },
    });
    expect(updateSupplierRes.ok(), await updateSupplierRes.text()).toBeTruthy();

    const productsRes = await request.get(
      `${API}/crm/inventory/products?page=1&pageSize=5&filter=active`,
      { headers },
    );
    expect(productsRes.ok(), await productsRes.text()).toBeTruthy();
    const products = await productsRes.json();
    const productId = products.items[0].id as string;
    const detailRes = await request.get(`${API}/crm/inventory/products/${productId}`, { headers });
    const detail = await detailRes.json();
    const variant = detail.variants[0];

    const poNumber = `PO-P2-${stamp}`;
    const createPurchaseRes = await request.post(`${API}/crm/inventory/purchases`, {
      headers,
      data: {
        supplierId: supplier.id,
        purchaseNumber: poNumber,
        paymentStatus: 'unpaid',
        purchaseDate: '2026-07-19',
        lines: [
          {
            productId,
            variantId: variant.id,
            quantity: 2,
            unitCost: Number(variant.costPrice) || 50,
          },
        ],
      },
    });
    expect(createPurchaseRes.ok(), await createPurchaseRes.text()).toBeTruthy();
    const purchase = await createPurchaseRes.json();

    const getRes = await request.get(`${API}/crm/inventory/purchases/${purchase.id}`, { headers });
    expect(getRes.ok(), await getRes.text()).toBeTruthy();
    const purchaseDetail = await getRes.json();
    expect(purchaseDetail.lines.length).toBeGreaterThan(0);
    expect(purchaseDetail.purchaseNumber).toBe(poNumber);

    const payRes = await request.patch(
      `${API}/crm/inventory/purchases/${purchase.id}/payment-status`,
      { headers, data: { paymentStatus: 'partial' } },
    );
    expect(payRes.ok(), await payRes.text()).toBeTruthy();
    expect((await payRes.json()).paymentStatus).toBe('partial');

    const cancelRes = await request.post(`${API}/crm/inventory/purchases/${purchase.id}/cancel`, {
      headers,
    });
    expect(cancelRes.ok(), await cancelRes.text()).toBeTruthy();
    expect((await cancelRes.json()).stockStatus).toBe('cancelled');

    const receiveCancelled = await request.post(
      `${API}/crm/inventory/purchases/${purchase.id}/receive`,
      { headers },
    );
    expect(receiveCancelled.status()).toBe(409);

    const deleteBlocked = await request.delete(`${API}/crm/inventory/suppliers/${supplier.id}`, {
      headers,
    });
    expect(deleteBlocked.status()).toBe(409);

    const inactiveRes = await request.patch(`${API}/crm/inventory/suppliers/${supplier.id}`, {
      headers,
      data: { status: 'inactive' },
    });
    expect(inactiveRes.ok(), await inactiveRes.text()).toBeTruthy();
  });
});
