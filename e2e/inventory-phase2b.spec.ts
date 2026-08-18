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
    'Content-Type': 'application/json',
  };
}

async function ensureProduct(
  request: APIRequestContext,
  headers: ReturnType<typeof authHeaders>,
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

test.describe('Inventory Phase 2b — returns approve + mixer recipes', () => {
  test('approve return and recipe CRUD', async ({ request }) => {
    const token = await login(request);
    const headers = authHeaders(token);
    const stamp = Date.now();

    const honey = await ensureProduct(request, headers, {
      sku: `E2E-P2B-HONEY-${stamp}`,
      name: 'E2E P2B Honey',
      salePrice: 500,
      costPrice: 320,
      stock: 20,
    });
    const raw = await ensureProduct(request, headers, {
      sku: `E2E-P2B-RAW-${stamp}`,
      name: 'E2E P2B Raw Honey',
      salePrice: 380,
      costPrice: 250,
      stock: 30,
    });

    const detailRes = await request.get(`${API}/crm/inventory/products/${honey!.id}`, { headers });
    const detail = await detailRes.json();
    const variant = detail.variants[0];

    const suppliersRes = await request.get(`${API}/crm/inventory/suppliers`, { headers });
    const suppliers = await suppliersRes.json();
    const supplier = (suppliers.items as { id: string; name: string; status: string }[]).find(
      (s) => s.status === 'active',
    );
    expect(supplier).toBeTruthy();

    const poNumber = `PO-P2B-${stamp}`;
    const purchaseRes = await request.post(`${API}/crm/inventory/purchases`, {
      headers,
      data: {
        supplierId: supplier!.id,
        purchaseNumber: poNumber,
        purchaseDate: '2026-07-19',
        lines: [
          {
            productId: honey!.id,
            variantId: variant.id,
            quantity: 5,
            unitCost: Number(variant.costPrice) || 100,
          },
        ],
      },
    });
    expect(purchaseRes.ok(), await purchaseRes.text()).toBeTruthy();
    const purchase = await purchaseRes.json();
    await request.post(`${API}/crm/inventory/purchases/${purchase.id}/receive`, { headers });

    const returnNumber = `PR-P2B-${stamp}`;
    const createReturnRes = await request.post(`${API}/crm/inventory/purchase-returns`, {
      headers,
      data: {
        returnNumber,
        purchaseId: purchase.id,
        purchaseNumber: poNumber,
        supplierName: supplier!.name,
        returnDate: '2026-07-19',
        reason: 'Phase2b approve flow',
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
    expect(createReturnRes.ok(), await createReturnRes.text()).toBeTruthy();
    const purchaseReturn = await createReturnRes.json();
    expect(purchaseReturn.status).toBe('pending');

    const approveRes = await request.post(
      `${API}/crm/inventory/purchase-returns/${purchaseReturn.id}/approve`,
      { headers },
    );
    expect(approveRes.ok(), await approveRes.text()).toBeTruthy();
    expect((await approveRes.json()).status).toBe('approved');

    const completeRes = await request.post(
      `${API}/crm/inventory/purchase-returns/${purchaseReturn.id}/complete`,
      { headers },
    );
    expect(completeRes.ok(), await completeRes.text()).toBeTruthy();

    const recipeName = `E2E Recipe ${stamp}`;
    const createRecipeRes = await request.post(`${API}/crm/inventory/mixer`, {
      headers,
      data: {
        name: recipeName,
        outputProductId: honey!.id,
        outputQty: 10,
        status: 'active',
        inputs: [{ productId: raw!.id, quantity: 5, unit: 'kg' }],
      },
    });
    expect(createRecipeRes.ok(), await createRecipeRes.text()).toBeTruthy();
    const recipe = await createRecipeRes.json();
    expect(recipe.inputs[0].productId).toBe(raw!.id);
    expect(recipe.outputProductId).toBe(honey!.id);

    const updateRecipeRes = await request.patch(`${API}/crm/inventory/mixer/${recipe.id}`, {
      headers,
      data: { status: 'draft', outputQty: 12 },
    });
    expect(updateRecipeRes.ok(), await updateRecipeRes.text()).toBeTruthy();
    expect((await updateRecipeRes.json()).outputQty).toBe(12);

    const deleteRecipeRes = await request.delete(`${API}/crm/inventory/mixer/${recipe.id}`, {
      headers,
    });
    expect(deleteRecipeRes.ok(), await deleteRecipeRes.text()).toBeTruthy();
  });
});
