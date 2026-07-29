import 'reflect-metadata';

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { CampaignsService } from './campaigns.service';

function createPrismaMock() {
  return {
    campaign: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    marketingSpend: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    order: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    lead: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

const orgId = 'org-1';

function sampleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'camp-1',
    organizationId: orgId,
    name: 'Ramadan Boost',
    status: 'active',
    platform: 'facebook',
    budgetBdt: 50000,
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    endDate: null,
    notes: null,
    landingPageName: 'Ramadan LP',
    landingPageUrl: 'https://example.com/ramadan',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('CampaignsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requireOrg throws without organization', () => {
    const service = new CampaignsService({} as never);
    expect(() => service.requireOrg(null)).toThrow(BadRequestException);
  });

  it('creates a campaign with defaults', async () => {
    const prisma = createPrismaMock();
    prisma.campaign.findFirst.mockResolvedValue(null);
    prisma.campaign.create.mockResolvedValue(sampleRow());
    const service = new CampaignsService(prisma as never);

    const result = await service.create(orgId, {
      name: 'Ramadan Boost',
      budgetBdt: 50000,
    });

    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Ramadan Boost',
          budgetBdt: 50000,
          status: 'active',
          platform: 'facebook',
        }),
      }),
    );
    expect(result.name).toBe('Ramadan Boost');
    expect(result.spendBdt).toBe(0);
  });

  it('rejects duplicate campaign names', async () => {
    const prisma = createPrismaMock();
    prisma.campaign.findFirst.mockResolvedValue(sampleRow());
    const service = new CampaignsService(prisma as never);

    await expect(
      service.create(orgId, { name: 'Ramadan Boost' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('builds overview with spend + order attribution', async () => {
    const prisma = createPrismaMock();
    prisma.campaign.findMany.mockResolvedValue([sampleRow()]);
    prisma.marketingSpend.findMany.mockResolvedValue([
      { campaignName: 'Ramadan Boost', spendBdt: 10000 },
      { campaignName: 'ramadan boost', spendBdt: 5000 },
    ]);
    prisma.order.findMany.mockResolvedValue([
      { utmCampaign: 'Ramadan Boost', amount: 20000, status: 'delivered' },
      { utmCampaign: 'Ramadan Boost', amount: 10000, status: 'confirmed' },
    ]);
    prisma.lead.findMany.mockResolvedValue([
      { campaignName: 'Ramadan Boost' },
      { campaignName: 'Ramadan Boost' },
    ]);
    const service = new CampaignsService(prisma as never);

    const overview = await service.overview(orgId);

    expect(overview.campaigns).toHaveLength(1);
    expect(overview.campaigns[0]!.spendBdt).toBe(15000);
    expect(overview.campaigns[0]!.orders).toBe(2);
    expect(overview.campaigns[0]!.revenueBdt).toBe(30000);
    expect(overview.campaigns[0]!.leads).toBe(2);
    expect(overview.campaigns[0]!.roas).toBe(2);
    expect(overview.landingPages).toHaveLength(1);
    expect(overview.landingPages[0]!.conversions).toBe(2);
    expect(overview.avgRoas).toBe(2);
  });

  it('getById throws when missing', async () => {
    const prisma = createPrismaMock();
    const service = new CampaignsService(prisma as never);
    await expect(service.getById(orgId, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates budget', async () => {
    const prisma = createPrismaMock();
    prisma.campaign.findFirst
      .mockResolvedValueOnce(sampleRow())
      .mockResolvedValueOnce(sampleRow({ budgetBdt: 60000 }));
    prisma.campaign.update.mockResolvedValue(sampleRow({ budgetBdt: 60000 }));
    prisma.campaign.findMany.mockResolvedValue([sampleRow({ budgetBdt: 60000 })]);
    const service = new CampaignsService(prisma as never);

    const result = await service.update(orgId, 'camp-1', { budgetBdt: 60000 });
    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ budgetBdt: 60000 }),
      }),
    );
    expect(result.budgetBdt).toBe(60000);
  });
});
