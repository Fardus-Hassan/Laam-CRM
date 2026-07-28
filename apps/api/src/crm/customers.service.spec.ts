import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';

import { CustomersService } from './customers.service';

function createPrismaMock() {
  const customer = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findFirstOrThrow: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const order = {
    count: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    aggregate: jest.fn(),
  };
  const followup = {
    findMany: jest.fn().mockResolvedValue([]),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
    findFirst: jest.fn().mockResolvedValue(null),
  };

  return {
    customer,
    order,
    followup,
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ customer, order, followup }),
    ),
  };
}

const baseCustomer = {
  id: 'cus_1',
  organizationId: 'org_1',
  customerNumber: 'CUS-00001',
  phoneNormalized: '01712345678',
  phone: '01712345678',
  name: 'Amina',
  email: null,
  altMobile: null,
  district: 'Dhaka',
  area: null,
  address: null,
  notes: null,
  tags: [] as string[],
  status: 'none',
  source: 'manual',
  assignedAgentName: null,
  hasFollowUp: false,
  followUpDue: null,
  firstOrderAt: null,
  lastOrderAt: null,
  orderCount: 0,
  deliveredCount: 0,
  failedCount: 0,
  totalSpent: 0,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
};

describe('CustomersService', () => {
  const orgId = 'org_1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects create without a valid BD phone', async () => {
    const prisma = createPrismaMock();
    const service = new CustomersService(prisma as never);

    await expect(
      service.create(orgId, { name: 'Amina', phone: '123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a customer with normalized phone uniqueness', async () => {
    const prisma = createPrismaMock();
    prisma.customer.findUnique.mockResolvedValue(null);
    prisma.customer.count.mockResolvedValue(0);
    prisma.customer.create.mockResolvedValue({
      ...baseCustomer,
      phone: '+8801712345678',
      phoneNormalized: '01712345678',
    });
    prisma.order.findMany.mockResolvedValue([]);

    const service = new CustomersService(prisma as never);
    const created = await service.create(orgId, {
      name: 'Amina',
      phone: '+8801712345678',
      district: 'Dhaka',
      source: 'manual',
    });

    expect(prisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phoneNormalized: '01712345678',
          phone: '+8801712345678',
          name: 'Amina',
        }),
      }),
    );
    expect(created.id).toBe('cus_1');
    expect(created.phone).toBe('+8801712345678');
  });

  it('blocks duplicate phone create', async () => {
    const prisma = createPrismaMock();
    prisma.customer.findUnique.mockResolvedValue({ id: 'cus_existing' });
    const service = new CustomersService(prisma as never);

    await expect(
      service.create(orgId, { name: 'Dup', phone: '01712345678' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ensureFromOrder upserts by normalized phone', async () => {
    const prisma = createPrismaMock();
    prisma.customer.findUnique.mockResolvedValue(null);
    prisma.customer.count.mockResolvedValue(2);
    prisma.customer.create.mockResolvedValue({
      ...baseCustomer,
      id: 'cus_2',
      customerNumber: 'CUS-00003',
      phoneNormalized: '01811112222',
      phone: '01811112222',
      name: 'Rahim',
      district: null,
      source: 'call',
    });
    prisma.order.findMany.mockResolvedValue([]);
    prisma.customer.findFirstOrThrow.mockResolvedValue({ status: 'none' });
    prisma.customer.update.mockResolvedValue({
      ...baseCustomer,
      id: 'cus_2',
      customerNumber: 'CUS-00003',
      phoneNormalized: '01811112222',
      phone: '01811112222',
      name: 'Rahim',
      district: null,
      source: 'call',
      orderCount: 0,
    });

    const service = new CustomersService(prisma as never);
    const customer = await service.ensureFromOrder(orgId, {
      name: 'Rahim',
      phone: '01811112222',
      source: 'call',
    });

    expect(customer.id).toBe('cus_2');
    expect(prisma.customer.create).toHaveBeenCalled();
    expect(prisma.customer.update).toHaveBeenCalled();
  });
});
