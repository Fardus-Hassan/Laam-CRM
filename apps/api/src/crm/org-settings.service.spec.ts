import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';

import { OrgSettingsService } from './org-settings.service';

function createPrismaMock() {
  return {
    organization: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    courierIntegration: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
}

describe('OrgSettingsService', () => {
  it('getSettings maps org columns and JSON extras', async () => {
    const prisma = createPrismaMock();
    prisma.organization.findUnique.mockResolvedValue({
      name: 'Laam',
      slug: 'laam',
      phone: '01700000000',
      branding: { logos: { light: '/logo.png' } },
      settings: {
        email: '',
        address: 'Dhaka',
        district: 'Dhaka',
        timezone: 'Asia/Dhaka',
        currency: 'BDT',
        orderPrefix: 'LM',
        defaultCourier: 'pathao',
      },
    });
    prisma.courierIntegration.findMany.mockResolvedValue([
      {
        id: 'c1',
        provider: 'pathao',
        enabled: true,
        lastSyncAt: new Date('2026-08-18T00:00:00.000Z'),
        lastError: null,
        credentialsEnc: 'enc',
      },
    ]);
    const service = new OrgSettingsService(prisma as never);

    const result = await service.getSettings('org-1');

    expect(result.profile).toEqual(
      expect.objectContaining({
        name: 'Laam',
        slug: 'laam',
        email: '',
        phone: '01700000000',
        address: 'Dhaka',
        orderPrefix: 'LM',
        defaultCourier: 'pathao',
        logoUrl: '/logo.png',
      }),
    );
    expect(result.integrations).toEqual([
      expect.objectContaining({
        provider: 'pathao',
        status: 'connected',
      }),
    ]);
  });

  it('updateProfile rejects a reserved slug', async () => {
    const prisma = createPrismaMock();
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      settings: {},
    });
    const service = new OrgSettingsService(prisma as never);

    await expect(service.updateProfile('org-1', { slug: 'platform' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('updateProfile rejects a taken slug', async () => {
    const prisma = createPrismaMock();
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      settings: {},
    });
    prisma.organization.findFirst.mockResolvedValue({ id: 'org-2' });
    const service = new OrgSettingsService(prisma as never);

    await expect(service.updateProfile('org-1', { slug: 'other-shop' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('updateProfile requires a connected courier for defaultCourier', async () => {
    const prisma = createPrismaMock();
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      settings: {},
    });
    prisma.courierIntegration.findFirst.mockResolvedValue(null);
    const service = new OrgSettingsService(prisma as never);

    await expect(
      service.updateProfile('org-1', { defaultCourier: 'pathao' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
