/**
 * Live check: product create (no merchandising) + catalog list + create/confirm order.
 * Usage: node apps/api/scripts/test-plain-catalog.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

function loadRootEnv() {
  const envPath = path.resolve(__dirname, '../../../.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadRootEnv();

const API = process.env.E2E_API_URL ?? 'http://localhost:3333/api';
const EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e.admin@laam.test';
const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'e2e.admin2026';
const DEVICE_ID = process.env.E2E_DEVICE_ID ?? 'e2e-device';
const TENANT = process.env.E2E_TENANT_SLUG ?? 'laam';
const STAMP = Date.now();
const SKU = `PLAIN-${String(STAMP).slice(-8)}`;

const prisma = new PrismaClient();
const failures = [];
let createdProductId = null;
let createdOrderId = null;

function pass(message) {
  console.log(`  PASS  ${message}`);
}
function fail(message) {
  console.log(`  FAIL  ${message}`);
  failures.push(message);
}
function assert(ok, message) {
  if (ok) pass(message);
  else fail(message);
}

async function req(method, pathname, token, body) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': TENANT,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { ok: res.ok, status: res.status, json, text };
}

async function must(method, pathname, token, body) {
  const result = await req(method, pathname, token, body);
  if (!result.ok) {
    throw new Error(
      `${method} ${pathname} -> ${result.status} ${String(result.text).slice(0, 400)}`,
    );
  }
  return result.json;
}

async function main() {
  console.log(`Plain catalog live test @ ${API} tenant=${TENANT}\n`);

  const health = await req('GET', '/health');
  assert(health.ok, 'API health is up');

  const org = await prisma.organization.findUnique({ where: { slug: TENANT } });
  assert(Boolean(org), `Tenant ${TENANT} exists`);
  const admin = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (admin) {
    await prisma.trustedDevice.upsert({
      where: { userId_deviceId: { userId: admin.id, deviceId: DEVICE_ID } },
      create: { userId: admin.id, deviceId: DEVICE_ID },
      update: {},
    });
  }

  const loginRes = await req('POST', '/auth/login', null, {
    email: EMAIL,
    password: PASSWORD,
    deviceId: DEVICE_ID,
  });
  const token = loginRes.json?.accessToken;
  assert(Boolean(token), 'Org admin can sign in');
  if (!token) throw new Error('No access token');

  try {
    const created = await must('POST', '/crm/inventory/products', token, {
      name: `Plain Catalog Oil ${STAMP}`,
      sku: SKU,
      status: 'active',
      reorderLevel: 5,
      tags: [],
      variants: [
        {
          label: 'Standard',
          sku: `${SKU}-STD`,
          salePrice: 450,
          costPrice: 200,
          stock: 20,
          reorderLevel: 5,
          weightKg: 0.5,
          baseUomCode: 'pcs',
        },
      ],
    });
    createdProductId = created.id;
    assert(Boolean(created.id), 'Product create works without Hero/Cross-sell/Upsell');
    const tags = created.tags ?? [];
    assert(
      !tags.some((t) => ['hero', 'upsell', 'cross_sell'].includes(String(t).toLowerCase())),
      'New product has no merchandising tags',
    );

    const listed = await must(
      'GET',
      `/crm/inventory/products?filter=active&search=${SKU}&page=1&pageSize=40`,
      token,
    );
    const items = listed.items ?? listed;
    const inCatalog = Array.isArray(items) && items.some((p) => p.id === created.id);
    assert(inCatalog, 'Create Order catalog API returns the new product in the flat list');

    const detail = await must('GET', `/crm/inventory/products/${created.id}`, token);
    const variant = detail.variants?.[0];
    assert(Boolean(variant?.id), 'Product detail has a sellable variant');

    const warehouses = await req('GET', '/crm/inventory/warehouses', token);
    const whList = warehouses.json?.items ?? warehouses.json ?? [];
    const warehouse = Array.isArray(whList)
      ? whList.find((w) => w.isActive !== false) ?? whList[0]
      : null;

    const order = await must('POST', '/crm/orders', token, {
      customerName: 'Plain Catalog Customer',
      customerPhone: `0171${String(STAMP).slice(-7)}`,
      shippingAddress: 'House 12, Banani, Dhaka 1213, Bangladesh',
      shippingArea: 'Dhaka',
      district: 'Dhaka',
      source: 'call',
      status: 'pending',
      paymentMethod: 'cod',
      deliveryCharge: 80,
      skipFollowup: true,
      notes: `plain-catalog-${STAMP}`,
      ...(warehouse?.id ? { fulfillmentWarehouseId: warehouse.id } : {}),
      lineItems: [
        {
          productId: created.id,
          variantId: variant.id,
          productName: created.name,
          sku: variant.sku,
          quantity: 1,
          unitPrice: Number(variant.salePrice) || 450,
        },
      ],
    });
    createdOrderId = order.id;
    assert(order.lineItems?.length === 1, 'Create order can add the catalog product as a line');
    assert(
      !order.incentiveFlags?.crossSell && !order.incentiveFlags?.upsell,
      'CRM-manual catalog add is not incentive CS/US',
    );

    const confirmed = await must('PATCH', `/crm/orders/${order.id}`, token, {
      status: 'confirmed',
      ...(warehouse?.id ? { fulfillmentWarehouseId: warehouse.id } : {}),
    });
    assert(confirmed.status === 'confirmed' || Boolean(confirmed.orderCreditedAt), 'Order confirms after catalog add');
  } finally {
    if (createdOrderId) {
      await req('DELETE', `/crm/orders/${createdOrderId}`, token);
    }
    if (createdProductId) {
      await req('DELETE', `/crm/inventory/products/${createdProductId}`, token);
    }
  }

  console.log('\n--- Result ---');
  if (failures.length) {
    console.log(`${failures.length} check(s) failed:`);
    for (const item of failures) console.log(` - ${item}`);
    process.exitCode = 1;
  } else {
    console.log('Product create + flat catalog + order path passed.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
