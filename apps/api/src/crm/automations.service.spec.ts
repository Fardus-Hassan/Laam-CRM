import 'reflect-metadata';

import { AutomationsService } from './automations.service';

function createPrismaMock() {
  return {
    orgAutomationSettings: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    order: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };
}

describe('AutomationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getSettings merges SMS + follow-up defaults', async () => {
    const prisma = createPrismaMock();
    prisma.orgAutomationSettings.create.mockResolvedValue({
      autoFollowupOnStatusChange: false,
      statusFollowupMap: {},
      updatedAt: new Date('2026-07-29T00:00:00.000Z'),
    });
    const sms = {
      getPublic: jest.fn().mockResolvedValue({
        autoSmsOnStatusChange: true,
        statusSmsMap: { confirmed: 'confirm' },
        enabled: true,
        updatedAt: '2026-07-28T00:00:00.000Z',
      }),
      updateStatusAutomation: jest.fn(),
    };
    const followups = { createFromOrder: jest.fn() };
    const service = new AutomationsService(prisma as never, sms as never, followups as never);

    const settings = await service.getSettings('org-1');
    expect(settings.autoSmsOnStatusChange).toBe(true);
    expect(settings.statusSmsMap.confirmed).toBe('confirm');
    expect(settings.autoFollowupOnStatusChange).toBe(false);
    expect(settings.smsEnabled).toBe(true);
  });

  it('tryAutoFollowupOnStatusChange creates follow-up when map matches', async () => {
    const prisma = createPrismaMock();
    prisma.orgAutomationSettings.findUnique.mockResolvedValue({
      autoFollowupOnStatusChange: true,
      statusFollowupMap: {
        pending: { queue: 2, delayDays: 1, note: 'Call back' },
      },
    });
    prisma.order.findFirst.mockResolvedValue({
      id: 'o1',
      orderNumber: 'ORD-1',
      customerName: 'Fatema',
      customerPhone: '01700000000',
      shippingAddress: 'Dhaka',
      district: 'Dhaka',
      shippingArea: 'Mirpur',
      source: 'facebook',
      assignedAgentName: 'Sakib',
      customerNote: null,
      customerId: 'c1',
      lineItems: [{ productName: 'Modhu', quantity: 1 }],
    });
    const sms = { getPublic: jest.fn(), updateStatusAutomation: jest.fn() };
    const followups = { createFromOrder: jest.fn().mockResolvedValue({ id: 'fu1' }) };
    const service = new AutomationsService(prisma as never, sms as never, followups as never);

    await service.tryAutoFollowupOnStatusChange('org-1', 'o1', 'pending');

    expect(followups.createFromOrder).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        orderId: 'o1',
        queue: 2,
        delayDays: 1,
        followupNotes: 'Call back',
      }),
      expect.objectContaining({ name: 'Automation' }),
    );
  });

  it('tryAutoFollowupOnStatusChange no-ops when disabled', async () => {
    const prisma = createPrismaMock();
    prisma.orgAutomationSettings.findUnique.mockResolvedValue({
      autoFollowupOnStatusChange: false,
      statusFollowupMap: { pending: { queue: 1, delayDays: 0 } },
    });
    const followups = { createFromOrder: jest.fn() };
    const service = new AutomationsService(
      prisma as never,
      { getPublic: jest.fn(), updateStatusAutomation: jest.fn() } as never,
      followups as never,
    );

    await service.tryAutoFollowupOnStatusChange('org-1', 'o1', 'pending');
    expect(followups.createFromOrder).not.toHaveBeenCalled();
  });
});
