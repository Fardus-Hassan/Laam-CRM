import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';

import { OrderPaymentsService } from './order-payments.service';

describe('OrderPaymentsService', () => {
  const orgId = 'org_1';

  function createMocks() {
    const order = {
      findFirst: jest.fn(),
      update: jest.fn(),
    };
    const orderPayment = {
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    };
    const orderActivity = {
      create: jest.fn(),
    };
    const prisma = {
      order,
      orderPayment,
      orderActivity,
      $transaction: jest.fn(async (ops: unknown) => {
        if (Array.isArray(ops)) {
          return Promise.all(ops);
        }
        throw new Error('unexpected transaction shape');
      }),
    };
    const accounting = {
      postOrderCollection: jest.fn().mockResolvedValue('je_1'),
    };
    return { prisma, accounting, order, orderPayment, orderActivity };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts ledger then records collection', async () => {
    const { prisma, accounting, order, orderPayment, orderActivity } = createMocks();
    order.findFirst.mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'ORD-1',
      amount: 1000,
      paidAmount: 0,
      paymentMethod: 'cod',
      paymentStatus: 'cod',
    });
    order.update.mockResolvedValue({});
    orderPayment.upsert.mockResolvedValue({
      id: 'pay_1',
      method: 'bkash',
      status: 'collected',
      collectedAmount: 400,
      collectedAt: new Date(),
      createdAt: new Date(),
      order: {
        id: 'ord_1',
        orderNumber: 'ORD-1',
        customerName: 'Amina',
        amount: 1000,
        paidAmount: 0,
      },
    });
    orderActivity.create.mockResolvedValue({});

    const service = new OrderPaymentsService(prisma as never, accounting as never);
    const record = await service.recordCollection(orgId, 'ord_1', {
      amount: 400,
      method: 'bkash',
    });

    expect(accounting.postOrderCollection).toHaveBeenCalledWith(orgId, {
      orderId: 'ord_1',
      orderNumber: 'ORD-1',
      amount: 400,
      paidTo: 400,
      paymentMethod: 'bkash',
    });
    expect(record.paid).toBe(400);
    expect(record.due).toBe(600);
  });

  it('rejects collection when already fully paid', async () => {
    const { prisma, accounting, order } = createMocks();
    order.findFirst.mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'ORD-1',
      amount: 1000,
      paidAmount: 1000,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
    });
    const service = new OrderPaymentsService(prisma as never, accounting as never);
    await expect(
      service.recordCollection(orgId, 'ord_1', { amount: 50 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(accounting.postOrderCollection).not.toHaveBeenCalled();
  });
});
