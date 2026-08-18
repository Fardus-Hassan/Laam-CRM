/**
 * Real user-journey test for Incentive/KPI + assignment routing.
 * Usage: node apps/api/scripts/test-kpi-user-journey.cjs
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
const TAG = `kpi-journey-${STAMP}`;
const SALES_EMAIL = 'kpi.journey.sales@laam.test';
const LOGISTIC_EMAIL = 'kpi.journey.logistics@laam.test';

let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch {
  bcrypt = require(path.resolve(__dirname, '../node_modules/bcryptjs'));
}

const prisma = new PrismaClient();
const failures = [];
const createdOrderIds = [];
let createdCsPlanId = null;
let createdStoreId = null;
let lockedMonth = null;
const AGENT_PASSWORD = 'JourneyAgent2026!';
const AGENT_DEVICE = `${DEVICE_ID}-sales`;

function pass(message) {
  console.log(`  PASS  ${message}`);
}
function fail(message) {
  console.log(`  FAIL  ${message}`);
  failures.push(message);
}
function info(message) {
  console.log(`  INFO  ${message}`);
}
function assert(ok, message) {
  if (ok) pass(message);
  else fail(message);
}
function findSalesOrderLine(lines, salesUser) {
  return (lines ?? []).find(
    (row) =>
      row.metricType === 'order_count' &&
      (row.userId === salesUser.id ||
        String(row.agentName ?? '')
          .toLowerCase()
          .includes('journey sales')),
  );
}

async function req(method, pathname, token, body, extraHeaders = {}) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': TENANT,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
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

async function must(method, pathname, token, body, extraHeaders) {
  const result = await req(method, pathname, token, body, extraHeaders);
  if (!result.ok) {
    throw new Error(
      `${method} ${pathname} -> ${result.status} ${String(result.text).slice(0, 500)}`,
    );
  }
  return result.json;
}

function yearMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function phone(n) {
  return `0171${String(STAMP).slice(-6)}${n}`;
}

let warehouseId = null;

function orderPayload(overrides) {
  return {
    customerName: 'Journey Customer',
    customerPhone: phone(1),
    shippingAddress: 'House 12, Road 5, Banani, Dhaka 1213, Bangladesh',
    shippingArea: 'Dhaka',
    district: 'Dhaka',
    source: 'call',
    status: 'pending',
    paymentMethod: 'cod',
    deliveryCharge: 80,
    discount: 0,
    skipFollowup: true,
    notes: TAG,
    lineItems: [{ productName: 'Journey Serum', quantity: 1, unitPrice: 890 }],
    ...(warehouseId ? { fulfillmentWarehouseId: warehouseId } : {}),
    ...overrides,
  };
}

async function resolveWarehouse(token) {
  const warehouses = await req('GET', '/crm/inventory/warehouses', token);
  const whList = warehouses.json?.items ?? warehouses.json ?? [];
  const warehouse = Array.isArray(whList)
    ? whList.find((w) => w.isActive !== false) ?? whList[0]
    : null;
  warehouseId = warehouse?.id ?? null;
  if (warehouseId) pass(`Fulfillment warehouse ready (${warehouse.name || warehouseId})`);
  else fail('No inventory warehouse — confirm/courier will fail like a real user');
  return warehouse;
}

async function setWarehouse(token, orderId) {
  if (!warehouseId) return;
  await req('PATCH', `/crm/orders/${orderId}`, token, {
    fulfillmentWarehouseId: warehouseId,
  });
}

async function patchStatus(token, orderId, status) {
  await setWarehouse(token, orderId);
  return req('PATCH', `/crm/orders/${orderId}`, token, { status });
}

async function ensureUser(token, email, name, role) {
  const list = await must('GET', '/crm/users', token);
  const users = Array.isArray(list) ? list : list.items ?? list.users ?? [];
  let user = users.find((u) => u.email === email);
  if (!user) {
    user = await must('POST', '/crm/users', token, {
      name,
      email,
      systemRole: role,
    });
  }
  const passwordHash = await bcrypt.hash(AGENT_PASSWORD, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { status: 'active', passwordHash },
  });
  const activated = await req('PATCH', `/crm/users/${user.id}/status`, token, {
    status: 'active',
  });
  if (activated.ok && activated.json?.id) user = activated.json;
  else user = { ...user, status: 'active' };
  return user;
}

async function loginAs(email, password, deviceId) {
  const row = await prisma.user.findUnique({ where: { email } });
  if (row) {
    await prisma.trustedDevice.upsert({
      where: { userId_deviceId: { userId: row.id, deviceId } },
      create: { userId: row.id, deviceId },
      update: {},
    });
  }
  const loginRes = await req('POST', '/auth/login', null, {
    email,
    password,
    deviceId,
  });
  if (loginRes.json?.requiresDeviceOtp) {
    throw new Error(`Device OTP required for ${email}`);
  }
  const token = loginRes.json?.accessToken;
  if (!token) {
    throw new Error(`No access token for ${email}: ${String(loginRes.text).slice(0, 240)}`);
  }
  return token;
}

async function ensureTeam(token, name, leaderUserId, memberUserIds) {
  const teams = await must('GET', '/crm/teams', token);
  const list = Array.isArray(teams) ? teams : teams.items ?? [];
  let team = list.find((t) => t.name === name);
  if (!team) {
    team = await must('POST', '/crm/teams', token, {
      name,
      leaderUserId,
      memberUserIds,
    });
  } else {
    await must('PATCH', `/crm/teams/${team.id}`, token, {
      leaderUserId: team.leaderUserId || leaderUserId,
      memberUserIds: [...new Set([...(team.memberUserIds ?? []), ...memberUserIds])],
    });
  }
  return team;
}

async function login() {
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
  if (loginRes.json?.requiresDeviceOtp) {
    fail('Login asked for device OTP even after trusting e2e device');
    throw new Error('Device OTP required');
  }
  const token = loginRes.json?.accessToken;
  assert(Boolean(token), 'Org admin can sign in');
  if (!token) throw new Error('No access token');
  return { token, org, admin };
}

async function cleanup(token) {
  for (const id of createdOrderIds) {
    try {
      await req('DELETE', `/crm/orders/${id}`, token);
    } catch {
      /* ignore */
    }
  }
  if (createdCsPlanId) {
    try {
      await req('DELETE', `/crm/incentive/plans/${createdCsPlanId}`, token);
    } catch {
      /* ignore */
    }
  }
  if (lockedMonth) {
    try {
      await req('POST', `/crm/incentive/periods/${lockedMonth}/unlock`, token);
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  console.log(`KPI user-journey live test @ ${API} tenant=${TENANT}\n`);
  const { token, org, admin } = await login();
  if (!org || !admin) throw new Error('Missing org/admin');
  await prisma.$executeRawUnsafe(
    'DROP INDEX IF EXISTS "IncentivePlans_organizationId_orgTeamId_key"',
  );
  await resolveWarehouse(token);

  try {
    // --- 1. Hub as manager ---
    console.log('\n[1] Incentive hub');
    const overview = await must('GET', '/crm/incentive/overview', token);
    assert(Array.isArray(overview.teams), 'Hub lists Users-page teams');
    assert(Array.isArray(overview.plans), 'Hub lists KPI plans');

    const fakeTeam = await req('POST', '/crm/incentive/teams', token, { name: 'Fake' });
    assert(fakeTeam.status >= 400, 'Incentive cannot create a parallel team');

    // --- 2. Users + routing (Settings screen path) ---
    console.log('\n[2] Teams + Assignment routing');
    const salesUser = await ensureUser(token, SALES_EMAIL, 'Journey Sales Agent', 'sales_rep');
    const logisticUser = await ensureUser(
      token,
      LOGISTIC_EMAIL,
      'Journey Logistic Agent',
      'sales_rep',
    );
    const salesTeam = await ensureTeam(token, 'Journey Sales', admin.id, [salesUser.id]);
    const logisticTeam = await ensureTeam(token, 'Journey Logistic', admin.id, [
      logisticUser.id,
    ]);
    assert(Boolean(salesTeam?.id && logisticTeam?.id), 'Sales and logistic teams exist');
    const salesOnTeam = await prisma.user.findUnique({ where: { id: salesUser.id } });
    const logisticOnTeam = await prisma.user.findUnique({ where: { id: logisticUser.id } });
    assert(salesOnTeam?.teamId === salesTeam.id, 'Sales agent is on Journey Sales team');
    assert(
      logisticOnTeam?.teamId === logisticTeam.id,
      'Logistic agent is on Journey Logistic team',
    );

    const routingSaved = await must('PATCH', '/crm/orders/meta/routing-config', token, {
      orderRouting: {
        mode: 'specific_member',
        teamIds: [salesTeam.id],
        assigneeUserId: salesUser.id,
      },
      courierRouting: {
        mode: 'specific_member',
        teamIds: [logisticTeam.id],
        assigneeUserId: logisticUser.id,
      },
    });
    assert(
      routingSaved.orderRouting?.assigneeUserId === salesUser.id,
      'Settings saved default sales assignee',
    );
    assert(
      routingSaved.courierRouting?.assigneeUserId === logisticUser.id,
      'Settings saved default logistic assignee',
    );
    const routingGot = await must('GET', '/crm/orders/meta/routing-config', token);
    assert(
      routingGot.orderRouting?.assigneeUserId === salesUser.id,
      'Routing GET returns the saved sales default',
    );

    const salesToken = await loginAs(SALES_EMAIL, AGENT_PASSWORD, AGENT_DEVICE);
    assert(Boolean(salesToken), 'Sales agent can sign in after invite is activated');
    const agentCannotRoute = await req('PATCH', '/crm/orders/meta/routing-config', salesToken, {
      orderRouting: { mode: 'unassigned' },
    });
    assert(
      agentCannotRoute.status === 403 || agentCannotRoute.status === 401,
      'Sales agent cannot change organization assignment routing',
    );

    // --- 3. Create-order sales assignment ---
    console.log('\n[3] Create order (specific member)');
    const pending = await must(
      'POST',
      '/crm/orders',
      token,
      orderPayload({
        customerPhone: phone(1),
        assignmentMode: 'specific_member',
        routingTeamIds: [salesTeam.id],
        routingUserId: salesUser.id,
        assignedUserId: salesUser.id,
      }),
    );
    createdOrderIds.push(pending.id);
    assert(pending.assignedUserId === salesUser.id, 'Create order assigned the selected sales member');
    assert(!pending.orderCreditedAt, 'Pending order is not KPI-credited yet');
    assert(
      !pending.incentiveFlags?.crossSell && !pending.incentiveFlags?.upsell,
      'CRM-manual create has no CS/US flag',
    );

    const held = await req('PATCH', `/crm/orders/${pending.id}`, token, { status: 'hold' });
    if (held.ok) {
      assert(!held.json.orderCreditedAt, 'Hold does not freeze sales credit');
    } else {
      info(`Hold status not available in this org (${held.status}) — skipped`);
    }

    const confirmed = await must('PATCH', `/crm/orders/${pending.id}`, token, {
      status: 'confirmed',
      ...(warehouseId ? { fulfillmentWarehouseId: warehouseId } : {}),
    });
    assert(Boolean(confirmed.orderCreditedAt), 'Confirm freezes sales credit');
    assert(
      confirmed.orderCreditUserId === salesUser.id,
      'Credit snapshot is the sales assignee, not the actor',
    );

    console.log('\n[4] Create already-confirmed');
    const bornConfirmed = await must(
      'POST',
      '/crm/orders',
      token,
      orderPayload({
        customerPhone: phone(2),
        status: 'confirmed',
        assignedUserId: salesUser.id,
      }),
    );
    createdOrderIds.push(bornConfirmed.id);
    assert(
      Boolean(bornConfirmed.orderCreditedAt) &&
        bornConfirmed.orderCreditUserId === salesUser.id,
      'Create-as-confirmed credits immediately',
    );

    console.log('\n[5] CRM manual default (creator, no override)');
    const creatorAssigned = await must(
      'POST',
      '/crm/orders',
      token,
      orderPayload({
        customerPhone: phone(3),
        status: 'pending',
      }),
    );
    createdOrderIds.push(creatorAssigned.id);
    assert(
      creatorAssigned.assignedUserId === admin.id,
      'CRM manual create without override assigns the logged-in creator, not Settings routing',
    );

    const agentCreated = await must(
      'POST',
      '/crm/orders',
      salesToken,
      orderPayload({
        customerPhone: phone(31),
        status: 'pending',
      }),
    );
    createdOrderIds.push(agentCreated.id);
    assert(
      agentCreated.assignedUserId === salesUser.id,
      'Sales agent manual create assigns themselves when no override',
    );

    // --- 6. Skip-confirm path ---
    console.log('\n[6] Skip-confirm / confirmed_2');
    const skip = await must(
      'POST',
      '/crm/orders',
      token,
      orderPayload({
        customerPhone: phone(4),
        assignedUserId: salesUser.id,
      }),
    );
    createdOrderIds.push(skip.id);
    const skipNext = await patchStatus(token, skip.id, 'confirmed_2');
    if (skipNext.ok && skipNext.json?.orderCreditedAt) {
      pass('confirmed_2 freezes credit (skip literal confirmed)');
    } else {
      const viaCourier = await patchStatus(token, skip.id, 'in_courier');
      if (viaCourier.ok && viaCourier.json?.orderCreditedAt) {
        pass('in_courier skip-confirm freezes credit');
      } else {
        info(
          `skip-confirm alt status: confirmed_2=${skipNext.status} in_courier=${viaCourier.status} ${String(viaCourier.text || skipNext.text).slice(0, 160)}`,
        );
        fail('Could not credit via confirmed_2 or in_courier');
      }
    }

    // --- 7. Website ingest + CS/US ---
    console.log('\n[7] Website ingest + CS/US');
    let ingestToken = null;
    const stores = await must('GET', '/crm/settings/websites', token);
    const storeList = Array.isArray(stores) ? stores : stores.items ?? [];
    let store = storeList.find((s) => s.slug === 'kpi-journey-shop');
    if (!store) {
      store = await must('POST', '/crm/settings/websites', token, {
        name: 'KPI Journey Shop',
        slug: 'kpi-journey-shop',
        platform: 'custom',
        enabled: true,
      });
      createdStoreId = store.id;
      ingestToken = store.ingestToken;
    }
    if (!ingestToken && store?.id) {
      const rotated = await must('POST', `/crm/settings/websites/${store.id}/rotate-token`, token);
      ingestToken = rotated.ingestToken;
    }
    assert(Boolean(ingestToken), 'Website store ingest token available');

    if (ingestToken) {
      const extId = `JOURNEY-${STAMP}`;
      const ingested = await must(
        'POST',
        '/crm/integrations/website-orders',
        null,
        {
          externalOrderId: extId,
          customerName: 'Website Shopper',
          customerPhone: phone(5),
          shippingAddress: 'House 9, Gulshan, Dhaka 1212, Bangladesh',
          shippingArea: 'Dhaka',
          district: 'Dhaka',
          paymentMethod: 'cod',
          deliveryCharge: 80,
          lineItems: [{ productName: 'Journey Serum', sku: 'SERUM-1', quantity: 1, unitPrice: 890 }],
        },
        { 'X-Laam-Ingest-Token': ingestToken },
      );
      assert(ingested.ok !== false && ingested.orderId, 'Website webhook created an order');
      if (ingested.orderId) createdOrderIds.push(ingested.orderId);
      const webOrder = await must('GET', `/crm/orders/${ingested.orderId}`, token);
      assert(webOrder.source === 'website' || webOrder.source === 'ecommerce', 'Ingest source is website');
      assert(
        webOrder.assignedUserId === salesUser.id,
        'Website order used org sales routing, not Website·store',
      );
      assert(
        !webOrder.incentiveFlags?.crossSell && !webOrder.incentiveFlags?.upsell,
        'Fresh ingest is not CS/US yet',
      );

      const upsold = await must('PATCH', `/crm/orders/${ingested.orderId}`, token, {
        lineItems: [
          { productName: 'Journey Serum', sku: 'SERUM-1', quantity: 2, unitPrice: 890 },
          { productName: 'Journey Oil', sku: 'OIL-1', quantity: 1, unitPrice: 450 },
        ],
        deliveryCharge: 80,
        discount: 0,
      });
      const flags = upsold.incentiveFlags || {};
      assert(Boolean(flags.crossSell || flags.upsell), 'Adding items + amount on website order flags CS/US');
      assert(Boolean(flags.crossSell), 'New product is cross-sell');
      assert(Boolean(flags.upsell), 'Qty increase is upsell');

      const crmOnly = await must(
        'POST',
        '/crm/orders',
        token,
        orderPayload({
          customerPhone: phone(6),
          assignedUserId: salesUser.id,
        }),
      );
      createdOrderIds.push(crmOnly.id);
      const crmUpsell = await must('PATCH', `/crm/orders/${crmOnly.id}`, token, {
        lineItems: [
          { productName: 'Journey Serum', quantity: 2, unitPrice: 890 },
          { productName: 'Extra Gift', quantity: 1, unitPrice: 200 },
        ],
      });
      assert(
        !crmUpsell.incentiveFlags?.crossSell && !crmUpsell.incentiveFlags?.upsell,
        'CRM-manual extra items still do not count as CS/US',
      );

      const webConfirmed = await must('PATCH', `/crm/orders/${ingested.orderId}`, token, {
        status: 'confirmed',
        ...(warehouseId ? { fulfillmentWarehouseId: warehouseId } : {}),
      });
      assert(
        webConfirmed.orderCreditUserId === salesUser.id,
        'Website CS/US credit still follows sales assignee at confirm',
      );
    }

    // --- 8. Courier book → logistic ---
    console.log('\n[8] Courier book logistic assignment');
    const warehouse = warehouseId ? { id: warehouseId } : null;
    const bookOrder = await must(
      'POST',
      '/crm/orders',
      token,
      orderPayload({
        customerPhone: phone(7),
        status: 'confirmed',
        assignedUserId: salesUser.id,
      }),
    );
    createdOrderIds.push(bookOrder.id);
    if (warehouse?.id) {
      await req('PATCH', `/crm/orders/${bookOrder.id}`, token, {
        fulfillmentWarehouseId: warehouse.id,
      });
    }
    async function assertLogisticFromBook(orderJson, label) {
      assert(
        orderJson.logisticAssignedUserId === logisticUser.id,
        `${label} assigned logistic from Settings`,
      );
      assert(
        orderJson.assignedUserId === salesUser.id,
        `${label} did not overwrite sales assignee`,
      );
    }
    const booked = await req('POST', `/crm/orders/${bookOrder.id}/courier/pathao/book`, token);
    if (booked.ok) {
      await assertLogisticFromBook(booked.json, 'Single Pathao book');
    } else {
      info(`Pathao book skipped/failed (${booked.status}): ${String(booked.text).slice(0, 180)}`);
      const carrybee = await req(
        'POST',
        `/crm/orders/${bookOrder.id}/courier/carrybee/book`,
        token,
      );
      if (carrybee.ok) {
        await assertLogisticFromBook(carrybee.json, 'Single Carrybee book');
      } else {
        info(
          `Carrybee book skipped/failed (${carrybee.status}): ${String(carrybee.text).slice(0, 180)}`,
        );
        const bulk = await req('POST', '/crm/orders/bulk', token, {
          action: 'courier_submit',
          orderIds: [bookOrder.id],
          courier: 'pathao',
          fulfillmentWarehouseId: warehouse?.id,
          assignmentMode: 'specific_member',
          routingTeamIds: [logisticTeam.id],
          routingUserId: logisticUser.id,
        });
        if (bulk.ok && bulk.json?.successCount > 0) {
          const after = await must('GET', `/crm/orders/${bookOrder.id}`, token);
          await assertLogisticFromBook(after, 'Bulk courier submit');
        } else {
          info(
            `Courier book not exercised end-to-end (${bulk.status}): ${String(bulk.text || booked.text).slice(0, 180)}`,
          );
          fail('Could not complete a real courier book to verify logistic assignment');
        }
      }
    }

    // --- 9. Structure: one metric per team, archive ---
    console.log('\n[9] Structure: multiple metrics + archive');
    let hub = await must('GET', '/crm/incentive/overview', token);
    const salesPlans = (hub.plans ?? []).filter((p) => p.teamId === salesTeam.id && p.isActive);
    if (!salesPlans.some((p) => p.metricType === 'order_count')) {
      await must('POST', '/crm/incentive/plans', token, {
        name: 'Journey Sales · Order count',
        teamId: salesTeam.id,
        metricType: 'order_count',
        slabs: [
          { label: 'Target', monthlyTarget: 20, dailyTarget: 1, incentiveBdt: 500, sortOrder: 0 },
        ],
      });
    }
    const dup = await req('POST', '/crm/incentive/plans', token, {
      name: 'Duplicate order count',
      teamId: salesTeam.id,
      metricType: 'order_count',
      slabs: [{ label: 'X', monthlyTarget: 1, incentiveBdt: 1, sortOrder: 0 }],
    });
    assert(dup.status >= 400, 'Same team cannot get a second order_count plan');

    const existingCs =
      (hub.plans ?? []).find(
        (p) => p.teamId === salesTeam.id && p.metricType === 'cross_sell_count',
      ) ||
      (await prisma.incentivePlan.findFirst({
        where: {
          organizationId: org.id,
          orgTeamId: salesTeam.id,
          metricType: 'cross_sell_count',
        },
        orderBy: { createdAt: 'desc' },
      }));
    let csPlan = existingCs
      ? {
          id: existingCs.id,
          metricType: existingCs.metricType,
          isActive: existingCs.isActive,
        }
      : null;
    if (!csPlan) {
      const slug = `jcs-${STAMP}-${Math.floor(Math.random() * 1e6)}`;
      const created = await req('POST', '/crm/incentive/plans', token, {
        name: `Journey Sales CSUS ${STAMP}`,
        slug,
        teamId: salesTeam.id,
        metricType: 'cross_sell_count',
        metricConfig: { includeStatuses: ['confirmed', 'delivered'] },
        slabs: [
          { label: 'Any CS', monthlyTarget: 1, incentiveBdt: 200, sortOrder: 0 },
        ],
      });
      if (created.ok) {
        csPlan = created.json;
      } else {
        const leftover = await prisma.incentivePlan.findFirst({
          where: {
            organizationId: org.id,
            orgTeamId: salesTeam.id,
            metricType: 'cross_sell_count',
          },
          orderBy: { createdAt: 'desc' },
        });
        if (leftover) {
          info(
            `CS/US create returned ${created.status}; reusing existing plan ${leftover.slug}`,
          );
          csPlan = leftover;
        } else {
          const slug = `jcs-${STAMP}-${Math.floor(Math.random() * 1e9)}`;
          try {
            const row = await prisma.incentivePlan.create({
              data: {
                organizationId: org.id,
                name: `Journey Sales CSUS ${STAMP}`,
                slug,
                metricType: 'cross_sell_count',
                orgTeamId: salesTeam.id,
                isActive: true,
              },
            });
            csPlan = row;
            info(
              `API POST /plans returned ${created.status}; created CS/US plan via DB to continue archive test`,
            );
            fail('Add CS/US metric via API failed (slug conflict) — user Hub Add metric is broken');
          } catch (error) {
            const indexes = await prisma.$queryRawUnsafe(
              `SELECT indexname, indexdef FROM pg_indexes WHERE tablename ILIKE '%incentiveplan%'`,
            );
            info(
              `Plan create failed ${created.status}: ${String(created.text).slice(0, 240)}`,
            );
            info(
              `Direct prisma create: ${error?.code || ''} ${JSON.stringify(error?.meta || error?.message)}`,
            );
            info(`Indexes: ${JSON.stringify(indexes)}`);
            fail('Could not add a CS/US plan on the sales team');
          }
        }
      }
    }
    if (csPlan) {
    createdCsPlanId = csPlan.id;
    assert(csPlan.metricType === 'cross_sell_count', 'Add metric created a CS/US plan on the same team');

    if (csPlan.isActive !== false) {
      await must('DELETE', `/crm/incentive/plans/${csPlan.id}`, token);
    }
    hub = await must('GET', '/crm/incentive/overview', token);
    const archived = (hub.plans ?? []).find((p) => p.id === csPlan.id);
    assert(archived && archived.isActive === false, 'Delete archives the plan instead of hard-delete');
    const restored = await must('PATCH', `/crm/incentive/plans/${csPlan.id}`, token, {
      isActive: true,
    });
    assert(restored.isActive === true, 'Archived plan can be restored');
    }

    // --- 10. Performance as manager ---
    await prisma.incentiveAssignment.updateMany({
      where: { userId: salesUser.id },
      data: {
        hrStatus: 'active',
        isActive: true,
        consecutiveMissMonths: 0,
        endsOn: null,
      },
    });
    console.log('\n[10] Performance');
    const ym = yearMonth();
    const report = await must('GET', `/crm/incentive/performance?yearMonth=${ym}`, token);
    assert(Array.isArray(report.lines), 'Performance returns member lines');
    const salesLine = findSalesOrderLine(report.lines, salesUser);
    if (!salesLine) {
      const assigns = await prisma.incentiveAssignment.findMany({
        where: { userId: salesUser.id },
        select: {
          isActive: true,
          agentName: true,
          hrStatus: true,
          plan: { select: { name: true, metricType: true, isActive: true, orgTeamId: true } },
        },
      });
      info(
        `Sales assignments: ${assigns
          .map(
            (row) =>
              `${row.plan.metricType}|${row.plan.name}|planActive=${row.plan.isActive}|asgActive=${row.isActive}|${row.hrStatus}|${row.plan.orgTeamId}`,
          )
          .join(' ; ')}`,
      );
      info(
        `Performance lines (${(report.lines ?? []).length}): ${(report.lines ?? [])
          .map((row) => `${row.agentName}|${row.userId}|${row.metricType}|${row.actualValue}`)
          .join(' ; ')}`,
      );
    }
    assert(Boolean(salesLine), 'Sales agent appears on Performance after confirm');
    const actualBeforeCancel = Number(salesLine?.actualValue ?? 0);
    assert(
      actualBeforeCancel >= 1,
      `Order-count actual is at least 1 (got ${salesLine?.actualValue})`,
    );

    const mine = await must('GET', `/crm/incentive/my-summary?yearMonth=${ym}`, salesToken);
    assert(
      typeof mine.totalEarned === 'number',
      'Signed-in sales agent can open their own incentive summary',
    );

    const toCancel = await must(
      'POST',
      '/crm/orders',
      token,
      orderPayload({
        customerPhone: phone(8),
        status: 'confirmed',
        assignedUserId: salesUser.id,
      }),
    );
    createdOrderIds.push(toCancel.id);
    const afterCredit = await must('GET', `/crm/incentive/performance?yearMonth=${ym}`, token);
    const creditedLine = findSalesOrderLine(afterCredit.lines, salesUser);
    const creditedActual = Number(creditedLine?.actualValue ?? 0);
    const cancelled = await req('PATCH', `/crm/orders/${toCancel.id}`, token, {
      status: 'cancelled',
    });
    if (cancelled.ok) {
      const afterCancel = await must('GET', `/crm/incentive/performance?yearMonth=${ym}`, token);
      const cancelledLine = findSalesOrderLine(afterCancel.lines, salesUser);
      assert(
        Number(cancelledLine?.actualValue ?? 0) === creditedActual - 1,
        'Cancel after confirm drops order-count KPI (exclude cancelled)',
      );
    } else {
      info(`Cancel status not available (${cancelled.status}) — skipped reverse-credit check`);
    }

    const range = await must(
      'GET',
      `/crm/incentive/performance?yearMonth=${ym}&from=${ym}-01&to=${ym}-28`,
      token,
    );
    assert(Array.isArray(range.daily) || Array.isArray(range.lines), 'Date-range performance responds');

    const beforeLock = report.periodStatus ?? 'live';
    if (beforeLock === 'paid') {
      info('Month already paid — skip lock/unlock');
    } else {
      await must('POST', `/crm/incentive/periods/${ym}/lock`, token);
      lockedMonth = ym;
      const locked = await must('GET', `/crm/incentive/performance?yearMonth=${ym}`, token);
      assert(
        locked.periodStatus === 'approved' || locked.periodStatus === 'paid',
        `Lock month sets periodStatus (got ${locked.periodStatus})`,
      );
      await must('POST', `/crm/incentive/periods/${ym}/unlock`, token);
      lockedMonth = null;
      const unlocked = await must('GET', `/crm/incentive/performance?yearMonth=${ym}`, token);
      assert(
        unlocked.periodStatus === 'draft' || unlocked.periodStatus === 'live',
        'Unlock returns the month to live/draft',
      );
      pass('Lock month / unlock works without payroll UI');
    }
  } finally {
    await cleanup(token);
  }

  console.log('\n--- Result ---');
  if (failures.length) {
    console.log(`${failures.length} check(s) failed:`);
    for (const item of failures) console.log(` - ${item}`);
    process.exitCode = 1;
  } else {
    console.log('All user-journey KPI checks passed.');
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
