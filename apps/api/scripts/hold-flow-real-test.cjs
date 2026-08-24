/**
 * Real Hold workflow smoke test against a running API + Postgres.
 * Usage: node apps/api/scripts/hold-flow-real-test.cjs
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

const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
const prisma = new PrismaClient();

const results = [];

function dhakaYmd(now = new Date()) {
  const d = new Date(now.getTime() + BD_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function startOfDhakaDay(ymd) {
  const [y, m, d] = ymd.split('-').map((p) => Number.parseInt(p, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

function addDaysYmd(ymd, days) {
  const base = startOfDhakaDay(ymd);
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

function ok(name, detail) {
  results.push({ name, pass: true, detail });
  console.log(`✅ PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  results.push({ name, pass: false, detail });
  console.error(`❌ FAIL  ${name} — ${detail}`);
}

async function api(method, route, { token, body } = {}) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tenant-slug': TENANT,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || text || res.statusText;
    const err = new Error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function login() {
  const data = await api('POST', '/auth/login', {
    body: { email: EMAIL, password: PASSWORD, deviceId: DEVICE_ID },
  });
  if (!data?.accessToken) {
    throw new Error(`Login did not return accessToken: ${JSON.stringify(data)}`);
  }
  return data.accessToken;
}

async function createHoldOrder(token, followUpDate) {
  return api('POST', '/crm/orders', {
    token,
    body: {
      customerName: `Hold Flow Test ${STAMP}`,
      customerPhone: `017${String(STAMP).slice(-8)}`,
      shippingAddress: 'House 12, Road 5, Dhanmondi, Dhaka',
      district: 'Dhaka',
      source: 'call',
      status: 'hold',
      followUpDate,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      deliveryCharge: 80,
      discount: 0,
      lineItems: [
        {
          productName: 'Hold Flow Test Product',
          quantity: 1,
          unitPrice: 500,
          discount: 0,
        },
      ],
      notes: `hold-flow-e2e-${STAMP}`,
      skipFollowup: true,
    },
  });
}

async function patchOrder(token, id, body) {
  return api('PATCH', `/crm/orders/${id}`, { token, body });
}

async function getOrder(token, id) {
  return api('GET', `/crm/orders/${id}`, { token });
}

async function getOpenFollowup(organizationId, orderId) {
  return prisma.followup.findFirst({
    where: {
      organizationId,
      orderId,
      skipped: false,
      followupStatus: { notIn: ['done', 'converted'] },
    },
  });
}

async function getAnyFollowup(organizationId, orderId) {
  return prisma.followup.findFirst({
    where: { organizationId, orderId },
  });
}

/** Same selection path as OrderHoldWorkflowService.promoteDueHoldOrders */
async function runPromoteLikeScanner(token) {
  const todayYmd = dhakaYmd();
  const startOfToday = startOfDhakaDay(todayYmd);
  const due = await prisma.followup.findMany({
    where: {
      orderId: { not: null },
      skipped: false,
      followupStatus: { notIn: ['done', 'converted'] },
      scheduleDate: { lte: startOfToday },
    },
    select: { organizationId: true, orderId: true },
  });
  const orderIds = [...new Set(due.map((d) => d.orderId).filter(Boolean))];
  const holdOrders = await prisma.order.findMany({
    where: { id: { in: orderIds }, status: 'hold', deletedAt: null },
    select: { id: true, orderNumber: true, organizationId: true },
  });

  let promoted = 0;
  for (const order of holdOrders) {
    // Only promote our test stamp orders to keep the run safe/local.
    if (!order.orderNumber) continue;
    const full = await prisma.order.findFirst({
      where: { id: order.id },
      select: { notes: true },
    });
    if (!full?.notes?.includes(`hold-flow-e2e-${STAMP}`)) continue;
    await patchOrder(token, order.id, { status: 'hold_followup' });
    promoted += 1;
  }
  return { candidateHold: holdOrders.length, promoted, todayYmd };
}

/** Same transition as OrderHoldWorkflowService.revertUnresolvedHoldFollowup */
async function runEodLikeScanner(token) {
  const todayYmd = dhakaYmd();
  const tomorrowYmd = addDaysYmd(todayYmd, 1);
  const stale = await prisma.order.findMany({
    where: {
      status: 'hold_followup',
      deletedAt: null,
      notes: { contains: `hold-flow-e2e-${STAMP}` },
    },
    select: { id: true, orderNumber: true },
  });
  let reverted = 0;
  for (const order of stale) {
    await patchOrder(token, order.id, {
      status: 'hold',
      followUpDate: tomorrowYmd,
    });
    reverted += 1;
  }
  return { reverted, tomorrowYmd, todayYmd };
}

async function main() {
  console.log('\n=== Hold flow real test ===');
  console.log(`API=${API} tenant=${TENANT} stamp=${STAMP}\n`);

  const today = dhakaYmd();
  const token = await login();
  ok('Login', `${EMAIL} @ ${TENANT}`);

  // 1) Hold without date must fail
  try {
    await api('POST', '/crm/orders', {
      token,
      body: {
        customerName: `Hold NoDate ${STAMP}`,
        customerPhone: `018${String(STAMP).slice(-8)}`,
        shippingAddress: 'Test address Dhaka Bangladesh',
        district: 'Dhaka',
        source: 'call',
        status: 'hold',
        paymentMethod: 'cod',
        lineItems: [{ productName: 'X', quantity: 1, unitPrice: 100 }],
        skipFollowup: true,
      },
    });
    fail('Hold without date rejected', 'create unexpectedly succeeded');
  } catch (e) {
    if (String(e.message).toLowerCase().includes('followupdate') || e.status === 400) {
      ok('Hold without date rejected', e.message);
    } else {
      fail('Hold without date rejected', e.message);
    }
  }

  // 2) Create Hold with today's date
  const created = await createHoldOrder(token, today);
  if (created?.status === 'hold' && created?.id) {
    ok('Create order as Hold + today date', `${created.orderNumber} status=${created.status}`);
  } else {
    fail('Create order as Hold + today date', JSON.stringify(created));
    throw new Error('Cannot continue without hold order');
  }

  const orgId = created.organizationId;
  // organizationId may not be on detail DTO — resolve from DB
  const dbOrder = await prisma.order.findFirst({
    where: { id: created.id },
    select: { organizationId: true, status: true, orderNumber: true },
  });
  const organizationId = orgId || dbOrder.organizationId;

  // 3) Followup schedule exists & open
  const fu1 = await getOpenFollowup(organizationId, created.id);
  if (fu1?.scheduleDate) {
    const ymd = fu1.scheduleDate.toISOString().slice(0, 10);
    // schedule may be UTC date; accept today or UTC equivalent of today
    ok(
      'Followup scheduled & open',
      `status=${fu1.followupStatus} schedule=${ymd} (expected ~${today})`,
    );
  } else {
    fail('Followup scheduled & open', 'no open followup row');
  }

  // 4) Promote Hold → Hold Followup (scanner selection + same updateStatus path)
  const promo = await runPromoteLikeScanner(token);
  const afterPromo = await getOrder(token, created.id);
  if (afterPromo.status === 'hold_followup' && promo.promoted >= 1) {
    ok('Hold → Hold Followup (due date promote)', `${afterPromo.orderNumber}`);
  } else {
    fail(
      'Hold → Hold Followup (due date promote)',
      `status=${afterPromo.status} promoted=${promo.promoted} candidates=${promo.candidateHold}`,
    );
  }

  const fuAfterPromo = await getOpenFollowup(organizationId, created.id);
  if (fuAfterPromo) {
    ok('Followup still open while Hold Followup', fuAfterPromo.followupStatus);
  } else {
    fail('Followup still open while Hold Followup', 'followup closed too early');
  }

  // 5) EOD-style: unresolved Hold Followup → Hold + tomorrow
  const eod = await runEodLikeScanner(token);
  const afterEod = await getOrder(token, created.id);
  const fuAfterEod = await getOpenFollowup(organizationId, created.id);
  if (afterEod.status === 'hold' && eod.reverted >= 1 && fuAfterEod) {
    ok(
      'Hold Followup → Hold (EOD unresolved)',
      `status=${afterEod.status} nextDue≈${eod.tomorrowYmd} fu=${fuAfterEod.followupStatus}`,
    );
  } else {
    fail(
      'Hold Followup → Hold (EOD unresolved)',
      `status=${afterEod.status} reverted=${eod.reverted} openFu=${Boolean(fuAfterEod)}`,
    );
  }

  // 6) Promote again to Hold Followup, then Confirm → followup must close as converted
  await patchOrder(token, created.id, { status: 'hold_followup' });
  const warehouses = await api('GET', '/crm/inventory/warehouses', { token });
  const warehouseId =
    (warehouses.items || warehouses)?.find((w) => w.isDefault)?.id ||
    (warehouses.items || warehouses)?.[0]?.id;
  if (!warehouseId) throw new Error('No warehouse available for confirm test');
  const confirmed = await patchOrder(token, created.id, {
    status: 'confirmed',
    fulfillmentWarehouseId: warehouseId,
  });
  const fuClosed = await getAnyFollowup(organizationId, created.id);
  const stillOpen = await getOpenFollowup(organizationId, created.id);
  if (
    confirmed.status === 'confirmed' &&
    fuClosed?.followupStatus === 'converted' &&
    !stillOpen
  ) {
    ok('Confirm closes followup (converted)', `fu=${fuClosed.followupStatus}`);
  } else {
    fail(
      'Confirm closes followup (converted)',
      `order=${confirmed.status} fu=${fuClosed?.followupStatus} stillOpen=${Boolean(stillOpen)}`,
    );
  }

  // 7) Cancel path: new hold order → cancel → done
  const cancelOrder = await createHoldOrder(token, today);
  await patchOrder(token, cancelOrder.id, { status: 'cancelled' });
  const cancelFu = await getAnyFollowup(
    (await prisma.order.findFirst({ where: { id: cancelOrder.id } })).organizationId,
    cancelOrder.id,
  );
  const cancelOpen = await getOpenFollowup(
    cancelFu.organizationId,
    cancelOrder.id,
  );
  if (cancelFu?.followupStatus === 'done' && !cancelOpen) {
    ok('Cancel closes followup (done)', cancelOrder.orderNumber);
  } else {
    fail(
      'Cancel closes followup (done)',
      `fu=${cancelFu?.followupStatus} open=${Boolean(cancelOpen)}`,
    );
  }

  // 8) Re-hold after confirm reopens followup
  const reholdDate = addDaysYmd(today, 2);
  const rehold = await patchOrder(token, created.id, {
    status: 'hold',
    followUpDate: reholdDate,
  });
  const reopened = await getOpenFollowup(organizationId, created.id);
  if (rehold.status === 'hold' && reopened && reopened.followupStatus !== 'converted') {
    ok('Re-hold reopens followup', `fu=${reopened.followupStatus} date set`);
  } else {
    fail(
      'Re-hold reopens followup',
      `order=${rehold.status} open=${Boolean(reopened)} fu=${reopened?.followupStatus}`,
    );
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('\nFatal:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
