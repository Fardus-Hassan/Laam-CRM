/**
 * Live Incentive/KPI check against the Laam tenant (API + DB).
 * Usage: node apps/api/scripts/test-laam-incentive.cjs
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
const AGENT_EMAIL = 'kpi.probe.agent@laam.test';
const AGENT_NAME = 'KPI Probe Agent';
const TARGET_ORDERS = 260;

const prisma = new PrismaClient();
const failures = [];

function assert(ok, message) {
  if (ok) {
    console.log(`  PASS  ${message}`);
    return;
  }
  console.log(`  FAIL  ${message}`);
  failures.push(message);
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
  if (!res.ok) {
    throw new Error(`${method} ${pathname} -> ${res.status} ${text.slice(0, 400)}`);
  }
  return json;
}

function yearMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function main() {
  console.log(`Laam incentive live test @ ${API} tenant=${TENANT}\n`);

  const login = await req('POST', '/auth/login', null, {
    email: EMAIL,
    password: PASSWORD,
    deviceId: DEVICE_ID,
  });
  const token = login.accessToken;
  assert(Boolean(token), 'Login as Laam org admin');
  if (!token) throw new Error('No access token');

  const org = await prisma.organization.findUnique({ where: { slug: TENANT } });
  assert(Boolean(org), 'Laam organization exists in DB');
  if (!org) throw new Error('Missing laam org');

  let overview = await req('GET', '/crm/incentive/overview', token);
  assert(Array.isArray(overview.teams), 'Overview returns Users teams list');

  let telesales = overview.teams.find((t) => /telesales/i.test(t.name));
  const admin = await prisma.user.findUnique({ where: { email: EMAIL } });
  assert(Boolean(admin), 'Org admin user exists');

  if (!telesales) {
    const created = await req('POST', '/crm/teams', token, {
      name: 'Telesales',
      leaderUserId: admin.id,
      memberUserIds: [],
    });
    assert(created?.id, 'Created Telesales Users team');
    overview = await req('GET', '/crm/incentive/overview', token);
    telesales = overview.teams.find((t) => /telesales/i.test(t.name));
  }
  assert(Boolean(telesales), 'Telesales Users team is visible on Incentive hub');

  try {
    await req('POST', '/crm/incentive/seed-defaults', token);
    console.log('  INFO  Applied PDF structure (or already present)');
  } catch (error) {
    console.log(`  INFO  seed-defaults: ${error.message.slice(0, 180)}`);
  }

  overview = await req('GET', '/crm/incentive/overview', token);
  telesales = overview.teams.find((t) => /telesales/i.test(t.name));
  assert(Boolean(telesales?.hasStructure), 'Telesales has KPI structure after PDF apply / existing plan');

  const plan = overview.plans.find(
    (p) => p.teamId === telesales.id || p.id === telesales.planId,
  );
  assert(Boolean(plan), 'Telesales plan loaded');
  assert(plan?.metricType === 'order_count', 'Telesales metric is order_count');
  const slab260 = plan?.slabs?.find((s) => Number(s.monthlyTarget) === 260);
  assert(Boolean(slab260), 'PDF slab 260 / ৳3000 exists');
  assert(Number(slab260?.incentiveBdt) === 3000, '260-order slab pays ৳3000');

  const createTeamBlocked = await fetch(`${API}/crm/incentive/teams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Tenant-Slug': TENANT,
    },
    body: JSON.stringify({ name: 'Fake Incentive Team' }),
  });
  assert(
    createTeamBlocked.status >= 400,
    'Incentive cannot create a separate team (Users-only)',
  );

  let agent = await prisma.user.findUnique({ where: { email: AGENT_EMAIL } });
  if (!agent) {
    const invited = await req('POST', '/crm/users', token, {
      name: AGENT_NAME,
      email: AGENT_EMAIL,
      systemRole: 'sales_rep',
    });
    agent = await prisma.user.findUnique({ where: { id: invited.id } });
  }
  assert(Boolean(agent), 'KPI probe agent exists');

  const existingTeam = await prisma.team.findUnique({ where: { id: telesales.id } });
  const memberIds = (
    await prisma.user.findMany({
      where: { organizationId: org.id, teamId: telesales.id },
      select: { id: true },
    })
  )
    .map((u) => u.id)
    .filter((id) => id !== existingTeam.leaderUserId && id !== agent.id);
  await req('PATCH', `/crm/teams/${telesales.id}`, token, {
    leaderUserId: existingTeam.leaderUserId,
    memberUserIds: [...memberIds, agent.id],
  });
  const onTeam = await prisma.user.findUnique({ where: { id: agent.id } });
  assert(onTeam?.teamId === telesales.id, 'Probe agent is a Telesales member');

  const ym = yearMonth();
  const periodStart = new Date(`${ym}-01T00:00:00.000Z`);

  await prisma.order.deleteMany({
    where: {
      organizationId: org.id,
      assignedUserId: agent.id,
      notes: 'kpi-probe',
    },
  });

  const stamp = Date.now();
  const rows = Array.from({ length: TARGET_ORDERS }, (_, i) => ({
    organizationId: org.id,
    orderNumber: `KPI-PROBE-${stamp}-${i + 1}`,
    status: 'confirmed',
    customerName: 'KPI Probe Customer',
    customerPhone: `0180000${String(1000 + (i % 8000)).padStart(4, '0')}`,
    source: 'call',
    itemsCount: 1,
    amount: 1500,
    paymentStatus: 'cod',
    shippingAddress: 'Dhaka',
    shippingArea: 'Dhaka',
    assignedAgentName: AGENT_NAME,
    assignedUserId: agent.id,
    notes: 'kpi-probe',
    orderDate: new Date(periodStart.getTime() + (i % 20) * 3600_000),
  }));
  await prisma.order.createMany({ data: rows });
  const stored = await prisma.order.count({
    where: { organizationId: org.id, assignedUserId: agent.id, notes: 'kpi-probe' },
  });
  assert(stored === TARGET_ORDERS, `Inserted ${TARGET_ORDERS} confirmed orders for probe agent`);

  await req('POST', '/crm/incentive/seed-sync-missing', token);
  const report = await req(
    'GET',
    `/crm/incentive/performance?yearMonth=${ym}`,
    token,
  );
  const line = (report.lines ?? []).find(
    (row) => row.userId === agent.id || row.agentName === AGENT_NAME,
  );
  assert(Boolean(line), 'Performance includes probe agent after member sync');
  assert(
    Number(line?.actualValue) === TARGET_ORDERS,
    `Actual order count is ${TARGET_ORDERS} (got ${line?.actualValue})`,
  );
  assert(
    Number(line?.incentiveBdt) === 3000,
    `Highest qualifying slab: 260 orders = ৳3000 (got ৳${line?.incentiveBdt})`,
  );
  assert(
    !line?.prorataApplied,
    'Prorata not applied at exactly 260 (only above top slab)',
  );

  const below = (report.lines ?? []).filter(
    (row) => row.planName === line?.planName && Number(row.actualValue) < 208,
  );
  if (below.length) {
    assert(
      below.every((row) => Number(row.incentiveBdt) === 0),
      'Agents below 208 monthly target earn ৳0',
    );
  } else {
    console.log('  INFO  No other Telesales agents below entry slab this month');
  }

  const rollup = (report.teamRollups ?? []).find(
    (row) => row.orgTeamId === telesales.id || row.planId === plan.id,
  );
  assert(Boolean(rollup), 'Team rollup exists for Telesales');
  assert(
    Number(rollup?.actualTotal) >= TARGET_ORDERS,
    'Team rollup actual includes probe agent orders',
  );

  console.log('\n--- Result ---');
  if (failures.length) {
    console.log(`${failures.length} check(s) failed:`);
    for (const item of failures) console.log(` - ${item}`);
    process.exitCode = 1;
  } else {
    console.log('All live Incentive/KPI checks passed on Laam tenant.');
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
