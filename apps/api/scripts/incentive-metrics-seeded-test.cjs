/**
 * Seed real CRM/ops data for EVERY incentive metric, then assert performance
 * like a user would see on the hub.
 *
 * Usage: node apps/api/scripts/incentive-metrics-seeded-test.cjs
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
const NOTE = `incentive-seed-${STAMP}`;
const agentFor = (metric) => `Seed ${metric} ${STAMP}`;

const prisma = new PrismaClient();
const results = [];

function ok(name, detail) {
  results.push({ name, pass: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail) {
  results.push({ name, pass: false, detail });
  console.error(`FAIL  ${name} — ${detail}`);
}

function yearMonth(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function lastSlabIncentive(slabs, actual) {
  const sorted = [...slabs].sort((a, b) => a.monthlyTarget - b.monthlyTarget);
  const qualifying = sorted.filter((s) => actual >= s.monthlyTarget);
  if (!qualifying.length) return { incentiveBdt: 0, prorataApplied: false };
  const best = qualifying[qualifying.length - 1];
  if (actual > best.monthlyTarget && best.monthlyTarget > 0) {
    return {
      incentiveBdt: Math.round((best.incentiveBdt * actual) / best.monthlyTarget),
      prorataApplied: true,
    };
  }
  return { incentiveBdt: best.incentiveBdt, prorataApplied: false };
}

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, deviceId: DEVICE_ID }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`login ${res.status}: ${text}`);
  const body = JSON.parse(text);
  if (!body.accessToken) throw new Error('missing accessToken');
  return body.accessToken;
}

async function api(method, urlPath, token, body) {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Tenant-Slug': TENANT,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data, text };
}

const PLAN_DEFS = {
  order_count: {
    name: `Seed Order count ${STAMP}`,
    slabs: [
      { label: '10', monthlyTarget: 10, incentiveBdt: 1000 },
      { label: '20', monthlyTarget: 20, incentiveBdt: 2500 },
    ],
    actual: 15,
  },
  cross_sell_count: {
    name: `Seed Cross-sell ${STAMP}`,
    slabs: [
      { label: '5', monthlyTarget: 5, incentiveBdt: 800 },
      { label: '10', monthlyTarget: 10, incentiveBdt: 2000 },
    ],
    actual: 7,
    metricConfig: { minItems: 2 },
  },
  return_ratio: {
    name: `Seed Return ratio ${STAMP}`,
    slabs: [
      { label: '≤4%', monthlyTarget: 4, incentiveBdt: 2500 },
      { label: '≤5%', monthlyTarget: 5, incentiveBdt: 2000 },
    ],
    // 4 returned / (96 delivered + 4 returned) = 4%
    delivered: 96,
    returned: 4,
    actualPct: 4,
  },
  recovery_count: {
    name: `Seed Recovery ${STAMP}`,
    slabs: [
      { label: '3', monthlyTarget: 3, incentiveBdt: 500 },
      { label: '6', monthlyTarget: 6, incentiveBdt: 1200 },
    ],
    actual: 4,
  },
  survey_count: {
    name: `Seed Survey ${STAMP}`,
    slabs: [
      { label: '10', monthlyTarget: 10, incentiveBdt: 500 },
      { label: '20', monthlyTarget: 20, incentiveBdt: 1200 },
    ],
    actual: 15,
  },
  channel_activity: {
    name: `Seed Channel ${STAMP}`,
    slabs: [
      { label: '10', monthlyTarget: 10, incentiveBdt: 400 },
      { label: '20', monthlyTarget: 20, incentiveBdt: 900 },
    ],
    actual: 12,
    metricConfig: { channels: ['whatsapp', 'call'] },
  },
  manual: {
    name: `Seed Manual ${STAMP}`,
    slabs: [
      { label: '10', monthlyTarget: 10, incentiveBdt: 300 },
      { label: '20', monthlyTarget: 20, incentiveBdt: 700 },
    ],
    actual: 15,
  },
};

async function main() {
  console.log(`Seeded incentive metrics test @ ${API} tenant=${TENANT}`);
  const ym = yearMonth();
  const periodStart = new Date(`${ym}-01T06:00:00.000Z`);
  const token = await login();
  ok('login', EMAIL);

  const org = await prisma.organization.findUnique({ where: { slug: TENANT } });
  if (!org) throw new Error('org missing');
  ok('org', org.id);

  const overview = await api('GET', '/crm/incentive/overview', token);
  if (overview.res.status !== 200) {
    fail('overview', overview.text);
    throw new Error('overview failed');
  }

  const session = await api('GET', '/auth/session', token);
  const adminId = session.data?.user?.id ?? session.data?.id;
  if (!adminId) {
    // fallback: prisma
  }
  const admin =
    (await prisma.user.findUnique({ where: { email: EMAIL } })) ??
    (adminId ? await prisma.user.findUnique({ where: { id: adminId } }) : null);
  if (!admin) throw new Error('admin user missing');

  const teamRes = await api('POST', '/crm/teams', token, {
    name: `Seed KPI Team ${STAMP}`,
    leaderUserId: admin.id,
    memberUserIds: [],
  });
  if (![200, 201].includes(teamRes.res.status)) {
    fail('team', `${teamRes.res.status} ${teamRes.text}`);
    throw new Error('team create failed');
  }
  const teamId = teamRes.data.id;
  ok('team', teamId);

  /** @type {Record<string, { plan: any, assignment: any, expect: any, agent: string }>} */
  const byMetric = {};

  for (const [metric, def] of Object.entries(PLAN_DEFS)) {
    const agent = agentFor(metric);
    const planRes = await api('POST', '/crm/incentive/plans', token, {
      name: def.name,
      teamId,
      metricType: metric,
      prorataAboveTop: true,
      metricConfig: def.metricConfig ?? undefined,
      slabs: def.slabs,
    });
    if (![200, 201].includes(planRes.res.status)) {
      fail(`plan ${metric}`, `${planRes.res.status} ${planRes.text}`);
      continue;
    }
    ok(`plan ${metric}`, planRes.data.id);

    const assignRes = await api('POST', '/crm/incentive/assignments', token, {
      planId: planRes.data.id,
      agentName: agent,
      startsOn: `${ym}-01`,
      isActive: true,
      hrStatus: 'active',
    });
    if (![200, 201].includes(assignRes.res.status)) {
      fail(`assign ${metric}`, `${assignRes.res.status} ${assignRes.text}`);
      continue;
    }
    ok(`assign ${metric}`, assignRes.data.id);

    const expectPay =
      metric === 'return_ratio'
        ? { incentiveBdt: 2500, prorataApplied: false, actual: def.actualPct }
        : {
            ...lastSlabIncentive(def.slabs, def.actual),
            actual: def.actual,
          };

    byMetric[metric] = {
      plan: planRes.data,
      assignment: assignRes.data,
      expect: expectPay,
      def,
      agent,
    };
  }

  // --- Seed order-backed metrics via Prisma ---
  const orderIds = [];

  // order_count: 15 confirmed + credited
  {
    const agent = agentFor('order_count');
    const n = PLAN_DEFS.order_count.actual;
    const rows = Array.from({ length: n }, (_, i) => ({
      organizationId: org.id,
      orderNumber: `SEED-OC-${STAMP}-${i + 1}`,
      status: 'confirmed',
      customerName: 'Seed OC Customer',
      customerPhone: `0171000${String(1000 + i).slice(-4)}`,
      source: 'call',
      itemsCount: 1,
      amount: 1200,
      paymentStatus: 'cod',
      shippingAddress: 'Dhaka',
      shippingArea: 'Dhaka',
      assignedAgentName: agent,
      orderCreditAgentName: agent,
      orderCreditedAt: new Date(periodStart.getTime() + i * 60_000),
      notes: NOTE,
      orderDate: new Date(periodStart.getTime() + i * 60_000),
    }));
    await prisma.order.createMany({ data: rows });
    ok('seed order_count', `${n} confirmed credited orders`);
  }

  // cross_sell: 7 website multi-item
  {
    const agent = agentFor('cross_sell_count');
    const n = PLAN_DEFS.cross_sell_count.actual;
    const rows = Array.from({ length: n }, (_, i) => ({
      organizationId: org.id,
      orderNumber: `SEED-CS-${STAMP}-${i + 1}`,
      status: 'confirmed',
      customerName: 'Seed CS Customer',
      customerPhone: `0172000${String(1000 + i).slice(-4)}`,
      source: 'website',
      itemsCount: 2,
      amount: 2200,
      paymentStatus: 'cod',
      shippingAddress: 'Dhaka',
      shippingArea: 'Dhaka',
      assignedAgentName: agent,
      orderCreditAgentName: agent,
      orderCreditedAt: new Date(periodStart.getTime() + i * 60_000),
      incentiveFlags: { crossSell: true },
      notes: NOTE,
      orderDate: new Date(periodStart.getTime() + i * 60_000),
    }));
    await prisma.order.createMany({ data: rows });
    ok('seed cross_sell_count', `${n} website CS orders`);
  }

  // return_ratio: logistic 96 delivered + 4 returned
  {
    const agent = agentFor('return_ratio');
    const d = PLAN_DEFS.return_ratio.delivered;
    const r = PLAN_DEFS.return_ratio.returned;
    const delivered = Array.from({ length: d }, (_, i) => ({
      organizationId: org.id,
      orderNumber: `SEED-RR-D-${STAMP}-${i + 1}`,
      status: 'delivered',
      customerName: 'Seed RR Customer',
      customerPhone: `0173000${String(1000 + (i % 8000)).slice(-4)}`,
      source: 'call',
      itemsCount: 1,
      amount: 1000,
      paymentStatus: 'cod',
      shippingAddress: 'Dhaka',
      shippingArea: 'Dhaka',
      logisticAssignedAgentName: agent,
      notes: NOTE,
      orderDate: new Date(periodStart.getTime() + i * 30_000),
    }));
    const returned = Array.from({ length: r }, (_, i) => ({
      organizationId: org.id,
      orderNumber: `SEED-RR-R-${STAMP}-${i + 1}`,
      status: 'returned',
      customerName: 'Seed RR Return',
      customerPhone: `0173100${String(1000 + i).slice(-4)}`,
      source: 'call',
      itemsCount: 1,
      amount: 1000,
      paymentStatus: 'cod',
      shippingAddress: 'Dhaka',
      shippingArea: 'Dhaka',
      logisticAssignedAgentName: agent,
      notes: NOTE,
      orderDate: new Date(periodStart.getTime() + (d + i) * 30_000),
    }));
    await prisma.order.createMany({ data: [...delivered, ...returned] });
    ok('seed return_ratio', `${d} delivered + ${r} returned (=4%)`);
  }

  // recovery_count: 4 orders pending → confirmed with activities
  {
    const agent = agentFor('recovery_count');
    const n = PLAN_DEFS.recovery_count.actual;
    for (let i = 0; i < n; i++) {
      const order = await prisma.order.create({
        data: {
          organizationId: org.id,
          orderNumber: `SEED-RC-${STAMP}-${i + 1}`,
          status: 'confirmed',
          customerName: 'Seed Recovery Customer',
          customerPhone: `0174000${String(1000 + i).slice(-4)}`,
          source: 'call',
          itemsCount: 1,
          amount: 900,
          paymentStatus: 'cod',
          shippingAddress: 'Dhaka',
          shippingArea: 'Dhaka',
          assignedAgentName: agent,
          orderCreditAgentName: agent,
          notes: NOTE,
          orderDate: new Date(periodStart.getTime() + i * 120_000),
        },
      });
      orderIds.push(order.id);
      const t0 = new Date(periodStart.getTime() + i * 120_000);
      const t1 = new Date(t0.getTime() + 60_000);
      await prisma.orderActivity.createMany({
        data: [
          {
            orderId: order.id,
            organizationId: org.id,
            type: 'status',
            label: 'Status',
            description: 'pending → hold',
            actorName: agent,
            createdAt: t0,
          },
          {
            orderId: order.id,
            organizationId: org.id,
            type: 'confirmed',
            label: 'Confirmed',
            description: 'hold → confirmed',
            actorName: agent,
            createdAt: t1,
          },
        ],
      });
    }
    ok('seed recovery_count', `${n} recovered orders + activities`);
  }

  // Ops metrics via API
  const survey = byMetric.survey_count;
  if (survey) {
    const res = await api('PATCH', '/crm/incentive/surveys', token, {
      agentName: survey.agent,
      assignmentId: survey.assignment.id,
      yearMonth: ym,
      surveyCount: PLAN_DEFS.survey_count.actual,
    });
    if (![200, 201].includes(res.res.status)) {
      fail('seed survey_count', res.text);
    } else {
      ok('seed survey_count', String(PLAN_DEFS.survey_count.actual));
    }
  }

  const channel = byMetric.channel_activity;
  if (channel) {
    const res = await api('PATCH', '/crm/incentive/channels', token, {
      agentName: channel.agent,
      assignmentId: channel.assignment.id,
      yearMonth: ym,
      channel: 'whatsapp',
      activityCount: PLAN_DEFS.channel_activity.actual,
    });
    if (![200, 201].includes(res.res.status)) {
      fail('seed channel_activity', res.text);
    } else {
      ok('seed channel_activity', String(PLAN_DEFS.channel_activity.actual));
    }
  }

  const manual = byMetric.manual;
  if (manual) {
    const res = await api('PATCH', '/crm/incentive/manual-actuals', token, {
      assignmentId: manual.assignment.id,
      yearMonth: ym,
      actualValue: PLAN_DEFS.manual.actual,
      note: NOTE,
    });
    if (![200, 201].includes(res.res.status)) {
      fail('seed manual', res.text);
    } else {
      ok('seed manual', String(PLAN_DEFS.manual.actual));
    }
  }

  // Performance assertions
  const perf = await api('GET', `/crm/incentive/performance?yearMonth=${ym}`, token);
  if (perf.res.status !== 200) {
    fail('performance', perf.text);
  } else {
    ok('performance', `lines=${(perf.data.lines ?? []).length}`);
    const lines = perf.data.lines ?? [];

    for (const [metric, ctx] of Object.entries(byMetric)) {
      const line = lines.find((l) => l.assignmentId === ctx.assignment.id);
      if (!line) {
        fail(`assert ${metric}`, 'no performance line');
        continue;
      }
      const actualOk = Number(line.actualValue) === Number(ctx.expect.actual);
      const payOk = Number(line.incentiveBdt) === Number(ctx.expect.incentiveBdt);
      const proOk =
        Boolean(line.prorataApplied) === Boolean(ctx.expect.prorataApplied);
      if (actualOk && payOk && proOk) {
        ok(
          `assert ${metric}`,
          `actual=${line.actualValue} pay=৳${line.incentiveBdt} prorata=${line.prorataApplied}`,
        );
      } else {
        fail(
          `assert ${metric}`,
          `got actual=${line.actualValue} pay=${line.incentiveBdt} prorata=${line.prorataApplied}; expected actual=${ctx.expect.actual} pay=${ctx.expect.incentiveBdt} prorata=${ctx.expect.prorataApplied}`,
        );
      }
    }
  }

  const failed = results.filter((r) => !r.pass);
  console.log('\n---');
  console.log(`${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log('Failed:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  } else {
    console.log('All seeded metric checks passed.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
