import 'reflect-metadata';

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { SupportService } from './support.service';

function createPrismaMock() {
  return {
    supportTicket: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };
}

const orgId = 'org-1';
const actor = { userId: 'u1', name: 'E2E Org Admin' };

function sampleRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-29T10:00:00.000Z');
  return {
    id: 'tk-1',
    organizationId: orgId,
    subject: 'Wrong product',
    status: 'open',
    priority: 'high',
    customerName: 'Fatema',
    customerMobile: '01700000000',
    orderId: 'o1',
    orderNumber: 'ORD-1',
    assigneeName: 'E2E Org Admin',
    createdByUserId: 'u1',
    createdByName: 'E2E Org Admin',
    messages: [
      {
        id: 'm1',
        authorName: 'E2E Org Admin',
        authorRole: 'agent',
        body: 'Customer reported wrong item',
        createdAt: now.toISOString(),
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('SupportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requireOrg throws without organization', () => {
    const service = new SupportService({} as never);
    expect(() => service.requireOrg(null)).toThrow(BadRequestException);
  });

  it('creates a ticket with first agent message', async () => {
    const prisma = createPrismaMock();
    prisma.supportTicket.create.mockResolvedValue(sampleRow());
    const service = new SupportService(prisma as never);

    const result = await service.create(
      orgId,
      {
        subject: 'Wrong product',
        body: 'Customer reported wrong item',
        priority: 'high',
        customerName: 'Fatema',
        customerMobile: '01700000000',
        orderNumber: 'ORD-1',
      },
      actor,
    );

    expect(prisma.supportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subject: 'Wrong product',
          status: 'open',
          priority: 'high',
          assigneeName: 'E2E Org Admin',
        }),
      }),
    );
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.authorRole).toBe('agent');
  });

  it('lists with summary counts', async () => {
    const prisma = createPrismaMock();
    prisma.supportTicket.count.mockResolvedValue(1);
    prisma.supportTicket.findMany
      .mockResolvedValueOnce([sampleRow()])
      .mockResolvedValueOnce([
        { status: 'open', priority: 'high' },
        { status: 'pending', priority: 'urgent' },
        { status: 'resolved', priority: 'low' },
      ]);
    const service = new SupportService(prisma as never);

    const result = await service.list(orgId, { page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.summary.open).toBe(1);
    expect(result.summary.pending).toBe(1);
    expect(result.summary.resolved).toBe(1);
    expect(result.summary.urgent).toBe(1);
  });

  it('reply appends agent message and moves open → pending', async () => {
    const prisma = createPrismaMock();
    prisma.supportTicket.findFirst.mockResolvedValue(sampleRow());
    prisma.supportTicket.update.mockResolvedValue(
      sampleRow({
        status: 'pending',
        messages: [
          ...(sampleRow().messages as unknown[]),
          {
            id: 'm2',
            authorName: 'E2E Org Admin',
            authorRole: 'agent',
            body: 'We will replace today',
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    );
    const service = new SupportService(prisma as never);

    const result = await service.reply(orgId, 'tk-1', 'We will replace today', actor);
    expect(prisma.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending' }),
      }),
    );
    expect(result.status).toBe('pending');
  });

  it('updateStatus throws when missing', async () => {
    const prisma = createPrismaMock();
    const service = new SupportService(prisma as never);
    await expect(
      service.updateStatus(orgId, 'missing', 'closed', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
