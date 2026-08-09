import 'reflect-metadata';

import { BadRequestException } from '@nestjs/common';

import { BillingService } from './billing.service';

function createPrismaMock() {
  const today = new Date('2026-07-01T00:00:00.000Z');
  const end = new Date('2026-08-01T00:00:00.000Z');
  return {
    orgBillingSubscription: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'sub-1',
        organizationId: 'org-1',
        plan: 'Pro',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: today,
        currentPeriodEnd: end,
        nextBillingDate: end,
        amountBdt: 4999,
        smsCredits: 5000,
        smsCreditsUsed: 100,
        orderQuota: 10000,
        userSeats: 15,
        autoRenew: true,
      }),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'sub-1',
          organizationId: 'org-1',
          plan: 'Pro',
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodStart: today,
          currentPeriodEnd: end,
          nextBillingDate: end,
          amountBdt: 4999,
          smsCredits: data.smsCredits ?? 5000,
          smsCreditsUsed: 100,
          orderQuota: 10000,
          userSeats: 15,
          autoRenew: true,
        }),
      ),
    },
    billingPaymentMethod: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    billingInvoice: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findUnique: jest.fn().mockResolvedValue({ plan: 'Pro' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      count: jest.fn().mockResolvedValue(3),
    },
    order: {
      count: jest.fn().mockResolvedValue(42),
    },
  };
}

describe('BillingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requireOrg throws without organization', () => {
    const service = new BillingService({} as never);
    expect(() => service.requireOrg(null)).toThrow(BadRequestException);
  });

  it('lists static plan catalog', () => {
    const service = new BillingService({} as never);
    const plans = service.listPlans();
    expect(plans.some((p) => p.name === 'Pro')).toBe(true);
  });

  it('getOverview creates subscription from org plan', async () => {
    const prisma = createPrismaMock();
    const service = new BillingService(prisma as never);
    const overview = await service.getOverview('org-1');
    expect(prisma.orgBillingSubscription.create).toHaveBeenCalled();
    expect(overview.subscription.plan).toBe('Pro');
    expect(overview.subscription.usersActive).toBe(3);
    expect(overview.subscription.ordersUsed).toBe(42);
  });

  it('recordCredits adds SMS credits', async () => {
    const prisma = createPrismaMock();
    const sub = {
      id: 'sub-1',
      organizationId: 'org-1',
      plan: 'Pro',
      status: 'active',
      billingCycle: 'monthly',
      currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
      nextBillingDate: new Date('2026-08-01T00:00:00.000Z'),
      amountBdt: 4999,
      smsCredits: 5000,
      smsCreditsUsed: 100,
      orderQuota: 10000,
      userSeats: 15,
      autoRenew: true,
    };
    prisma.orgBillingSubscription.findUnique.mockImplementation(() =>
      Promise.resolve({ ...sub }),
    );
    prisma.orgBillingSubscription.update.mockImplementation(({ data }) => {
      Object.assign(sub, data);
      return Promise.resolve({ ...sub });
    });
    const service = new BillingService(prisma as never);
    const overview = await service.recordCredits('org-1', { amountBdt: 1000 });
    expect(prisma.orgBillingSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ smsCredits: 5500 }),
      }),
    );
    expect(overview.subscription.smsCredits).toBe(5500);
  });
});
