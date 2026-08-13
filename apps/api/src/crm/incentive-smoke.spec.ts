import { createHmac } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import {
  applyReturnRatioCap,
  assignmentMatchKeys,
  countRecoveries,
  orderMatchKeys,
} from './incentive-calc';

/** Minimal HS256 JWT (no external dep) for local smoke against running API. */
function signHs256Jwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSec = 3600,
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
    'base64url',
  );
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresInSec,
    }),
  ).toString('base64url');
  const data = `${header}.${body}`;
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

/**
 * Live smoke against local Postgres + HTTP API.
 * Run: npx jest src/crm/incentive-smoke.spec.ts --runInBand
 */
describe('incentive production smoke', () => {
  const prisma = new PrismaClient();
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api';
  const jwtSecret = process.env.JWT_SECRET || 'laam-dev-jwt-secret-local';

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function authHeaders() {
    const orgWithOrders = await prisma.order.findFirst({
      select: { organizationId: true },
    });
    const user = await prisma.user.findFirst({
      where: {
        status: 'active',
        organizationId: orgWithOrders?.organizationId
          ? orgWithOrders.organizationId
          : { not: null },
      },
      select: { id: true, email: true, systemRole: true, organizationId: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!user?.organizationId) {
      throw new Error('No org user found for authenticated smoke');
    }
    const token = signHs256Jwt(
      {
        sub: user.id,
        email: user.email,
        role: user.systemRole,
        organizationId: user.organizationId,
      },
      jwtSecret,
    );
    return {
      user,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  it('has assignedUserId column + migration applied', async () => {
    const col = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
      `SELECT COUNT(*)::int AS c FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'assignedUserId'`,
    );
    expect(col[0]?.c).toBe(1);

    const mig = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
      `SELECT COUNT(*)::int AS c FROM _prisma_migrations WHERE migration_name = '20260813160000_order_assigned_user_id' AND finished_at IS NOT NULL`,
    );
    expect(mig[0]?.c).toBe(1);
  });

  it('can write and read Order.assignedUserId', async () => {
    const sample = await prisma.order.findFirst({
      select: { id: true, assignedUserId: true },
    });
    if (!sample) {
      console.warn('skip write/read: no orders');
      return;
    }
    const testUid = 'smoke-assigned-user-id';
    await prisma.order.update({
      where: { id: sample.id },
      data: { assignedUserId: testUid },
    });
    const after = await prisma.order.findUnique({
      where: { id: sample.id },
      select: { assignedUserId: true },
    });
    expect(after?.assignedUserId).toBe(testUid);
    await prisma.order.update({
      where: { id: sample.id },
      data: { assignedUserId: sample.assignedUserId },
    });
  });

  it('matches orders by userId preferentially', () => {
    const a = assignmentMatchKeys({ userId: 'abc', agentName: 'Ali' });
    const o = orderMatchKeys({ assignedUserId: 'abc', assignedAgentName: 'Someone Else' });
    expect(a.some((k) => o.includes(k))).toBe(true);
    expect(a).toContain('u:abc');
  });

  it('enforces return ratio quality gate', () => {
    expect(
      applyReturnRatioCap({
        incentiveBdt: 5000,
        returnRatioPct: 20,
        maxAgentReturnRatioPct: 15,
      }),
    ).toEqual({ incentiveBdt: 0, capped: true });
  });

  it('counts recoveries from incomplete to delivered', () => {
    const n = countRecoveries({
      orderIds: ['1'],
      activities: [
        {
          orderId: '1',
          description: 'incomplete',
          createdAt: new Date('2026-08-02T00:00:00Z'),
        },
        {
          orderId: '1',
          description: 'delivered',
          createdAt: new Date('2026-08-10T00:00:00Z'),
        },
      ],
      successStatuses: ['delivered'],
      recoveryFromStatuses: ['incomplete'],
      periodStart: new Date('2026-08-01T00:00:00Z'),
      periodEnd: new Date('2026-08-31T23:59:59Z'),
    });
    expect(n).toBe(1);
  });

  it('protects incentive HTTP routes', async () => {
    for (const path of [
      '/crm/incentive/overview',
      '/crm/incentive/my-summary',
      '/crm/incentive/periods/2026-08/export',
    ]) {
      const res = await fetch(`${base}${path}`);
      expect([401, 403]).toContain(res.status);
    }
  });

  it('incentive schema tables are readable', async () => {
    await expect(prisma.incentiveTeam.count()).resolves.toBeGreaterThanOrEqual(0);
    await expect(prisma.incentivePeriodRun.count()).resolves.toBeGreaterThanOrEqual(0);
  });

  it('authenticated my-summary + overview respond', async () => {
    const { headers } = await authHeaders();
    const overview = await fetch(`${base}/crm/incentive/overview`, { headers });
    expect([200, 403]).toContain(overview.status);
    if (overview.status === 200) {
      const body = (await overview.json()) as { planCount?: number };
      expect(typeof body.planCount === 'number' || body.planCount == null).toBe(true);
    }

    const summary = await fetch(`${base}/crm/incentive/my-summary`, { headers });
    expect([200, 403]).toContain(summary.status);
    if (summary.status === 200) {
      const body = (await summary.json()) as {
        totalEarned?: number;
        periodLabel?: string;
      };
      expect(typeof body.totalEarned).toBe('number');
      expect(typeof body.periodLabel).toBe('string');
    }
  });

  it('performance report returns lines shape', async () => {
    const { headers } = await authHeaders();
    const res = await fetch(`${base}/crm/incentive/performance?yearMonth=2026-08`, {
      headers,
    });
    expect([200, 403]).toContain(res.status);
    if (res.status !== 200) return;
    const body = (await res.json()) as {
      lines?: Array<{ metricType?: string; incentiveBdt?: number; warning?: string }>;
      totalIncentiveBdt?: number;
    };
    expect(Array.isArray(body.lines)).toBe(true);
    expect(typeof body.totalIncentiveBdt).toBe('number');
  });

  it('payroll export rejects draft / missing period cleanly', async () => {
    const { headers } = await authHeaders();
    const res = await fetch(`${base}/crm/incentive/periods/2099-01/export`, {
      headers,
    });
    expect([400, 403, 404]).toContain(res.status);
  });

  it('can persist assignedUserId via prisma like assign path', async () => {
    const { user } = await authHeaders();
    const order = await prisma.order.findFirst({
      where: { organizationId: user.organizationId! },
      select: { id: true, assignedUserId: true, assignedAgentName: true },
    });
    expect(order).toBeTruthy();
    await prisma.order.update({
      where: { id: order!.id },
      data: {
        assignedUserId: user.id,
        assignedAgentName: 'Smoke Agent',
      },
    });
    const after = await prisma.order.findUnique({
      where: { id: order!.id },
      select: { assignedUserId: true },
    });
    expect(after?.assignedUserId).toBe(user.id);

    const keys = orderMatchKeys({
      assignedUserId: after?.assignedUserId,
      assignedAgentName: 'Smoke Agent',
    });
    const agentKeys = assignmentMatchKeys({
      userId: user.id,
      agentName: 'Smoke Agent',
    });
    expect(keys.filter((k) => agentKeys.includes(k)).length).toBeGreaterThan(0);

    await prisma.order.update({
      where: { id: order!.id },
      data: {
        assignedUserId: order!.assignedUserId,
        assignedAgentName: order!.assignedAgentName,
      },
    });
  });
});
