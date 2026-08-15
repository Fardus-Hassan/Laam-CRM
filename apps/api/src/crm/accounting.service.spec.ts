import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AccountingService } from './accounting.service';
import { STANDARD_COA } from './accounting-coa';

function createPrismaMock() {
  const accountingAccount = {
    count: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const accountingJournalEntry = {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  };
  const accountingJournalLine = {
    findMany: jest.fn(),
  };
  const order = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const orderPayment = {
    upsert: jest.fn(),
  };
  const inventoryPurchase = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  };

  return {
    accountingAccount,
    accountingJournalEntry,
    accountingJournalLine,
    order,
    orderPayment,
    inventoryPurchase,
  };
}

describe('AccountingService', () => {
  const orgId = 'org_1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('seeds standard COA once when empty', async () => {
    const prisma = createPrismaMock();
    prisma.accountingAccount.count.mockResolvedValue(0);
    prisma.accountingAccount.createMany.mockResolvedValue({ count: STANDARD_COA.length });
    prisma.accountingAccount.findMany.mockResolvedValue(
      STANDARD_COA.map((a, i) => ({
        id: `acc_${i}`,
        organizationId: orgId,
        code: a.code,
        name: a.name,
        type: a.type,
        isActive: true,
        isSystem: true,
        cashKind: a.cashKind,
      })),
    );
    prisma.accountingJournalLine.findMany.mockResolvedValue([]);

    const service = new AccountingService(prisma as never);
    const result = await service.listChartOfAccounts(orgId);

    expect(prisma.accountingAccount.createMany).toHaveBeenCalled();
    expect(result.items.length).toBe(STANDARD_COA.length);
    expect(result.items[0]?.code).toBe('1000');
  });

  it('posts balanced income journal Dr Cash / Cr Sales', async () => {
    const prisma = createPrismaMock();
    prisma.accountingAccount.count.mockResolvedValue(STANDARD_COA.length);
    prisma.accountingJournalEntry.findFirst.mockResolvedValue(null);
    prisma.accountingJournalEntry.create.mockResolvedValue({ id: 'je_income_1' });

    const service = new AccountingService(prisma as never);
    const created = await service.createIncome(orgId, {
      date: '2026-07-21T00:00:00.000Z',
      category: 'order_sales',
      description: 'Walk-in sale',
      amount: 1500,
      paymentMethod: 'cash',
    });

    expect(created.id).toBe('je_income_1');
    expect(created.amount).toBe(1500);
    expect(prisma.accountingJournalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: 'order_sales',
          sourceType: 'manual_income',
          lines: {
            create: [
              expect.objectContaining({
                accountCode: '1000',
                debit: new Prisma.Decimal(1500),
                credit: new Prisma.Decimal(0),
              }),
              expect.objectContaining({
                accountCode: '4000',
                debit: new Prisma.Decimal(0),
                credit: new Prisma.Decimal(1500),
              }),
            ],
          },
        }),
      }),
    );
  });

  it('rejects non-positive income amount', async () => {
    const prisma = createPrismaMock();
    prisma.accountingAccount.count.mockResolvedValue(1);
    const service = new AccountingService(prisma as never);

    await expect(
      service.createIncome(orgId, {
        date: '2026-07-21T00:00:00.000Z',
        category: 'other_income',
        description: 'Bad',
        amount: 0,
        paymentMethod: 'cash',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('posts expense as Dr Expense / Cr Cash', async () => {
    const prisma = createPrismaMock();
    prisma.accountingAccount.count.mockResolvedValue(STANDARD_COA.length);
    prisma.accountingJournalEntry.findFirst.mockResolvedValue(null);
    prisma.accountingJournalEntry.create.mockResolvedValue({ id: 'je_exp_1' });

    const service = new AccountingService(prisma as never);
    const created = await service.createExpense(orgId, {
      date: '2026-07-21T00:00:00.000Z',
      category: 'courier',
      description: 'Pathao COD',
      amount: 80,
      paymentMethod: 'cash',
    });

    expect(created.id).toBe('je_exp_1');
    expect(prisma.accountingJournalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: 'courier',
          lines: {
            create: [
              expect.objectContaining({ accountCode: '5100', debit: new Prisma.Decimal(80) }),
              expect.objectContaining({ accountCode: '1000', credit: new Prisma.Decimal(80) }),
            ],
          },
        }),
      }),
    );
  });

  it('blocks deactivating system accounts', async () => {
    const prisma = createPrismaMock();
    prisma.accountingAccount.findFirst.mockResolvedValue({
      id: 'acc_cash',
      organizationId: orgId,
      code: '1000',
      name: 'Cash on Hand',
      type: 'asset',
      isActive: true,
      isSystem: true,
    });

    const service = new AccountingService(prisma as never);
    await expect(
      service.setAccountActive(orgId, 'acc_cash', false),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks receivable collected and posts cash journal', async () => {
    const prisma = createPrismaMock();
    prisma.order.findFirst.mockResolvedValue({
      id: 'ord_1',
      organizationId: orgId,
      orderNumber: 'ORD-1',
      customerName: 'Amina',
      customerPhone: '01712345678',
      amount: 2000,
      paidAmount: 0,
      paymentStatus: 'cod',
      orderDate: new Date('2026-07-01'),
      createdAt: new Date('2026-07-01'),
    });
    prisma.accountingJournalEntry.findFirst.mockResolvedValue(null);
    prisma.accountingJournalEntry.create.mockResolvedValue({ id: 'je_collect' });
    prisma.order.update.mockResolvedValue({});
    prisma.orderPayment.upsert.mockResolvedValue({});

    const service = new AccountingService(prisma as never);
    const item = await service.markReceivableCollected(orgId, 'ord_1');

    expect(item.status).toBe('collected');
    expect(item.collectedAmount).toBe(2000);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paidAmount: 2000,
          paymentStatus: 'paid',
        }),
      }),
    );
    expect(prisma.accountingJournalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventKey: 'ar-collect:ord_1:paid-to:2000',
        }),
      }),
    );
    expect(prisma.orderPayment.upsert).toHaveBeenCalled();
  });

  it('posts partial order collection with paid-to event key', async () => {
    const prisma = createPrismaMock();
    prisma.accountingAccount.count.mockResolvedValue(STANDARD_COA.length);
    prisma.accountingJournalEntry.findFirst.mockResolvedValue(null);
    prisma.accountingJournalEntry.create.mockResolvedValue({ id: 'je_partial' });

    const service = new AccountingService(prisma as never);
    await service.postOrderCollection(orgId, {
      orderId: 'ord_2',
      orderNumber: 'ORD-2',
      amount: 500,
      paidTo: 500,
      paymentMethod: 'bkash',
    });

    expect(prisma.accountingJournalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventKey: 'ar-collect:ord_2:paid-to:500',
          paymentMethod: 'bkash',
        }),
      }),
    );
  });

  it('throws when payable purchase missing', async () => {
    const prisma = createPrismaMock();
    prisma.inventoryPurchase.findFirst.mockResolvedValue(null);
    const service = new AccountingService(prisma as never);

    await expect(service.markPayablePaid(orgId, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('builds P&L from account balances including COGS', async () => {
    const prisma = createPrismaMock();
    prisma.accountingAccount.count.mockResolvedValue(STANDARD_COA.length);
    prisma.accountingJournalLine.findMany.mockResolvedValue([
      { accountCode: '4000', debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(5000) },
      { accountCode: '5000', debit: new Prisma.Decimal(2000), credit: new Prisma.Decimal(0) },
      { accountCode: '5100', debit: new Prisma.Decimal(300), credit: new Prisma.Decimal(0) },
    ]);
    prisma.accountingAccount.findMany.mockImplementation(async (args: { where?: { type?: string } }) => {
      const rows = STANDARD_COA.map((a, i) => ({
        id: `acc_${i}`,
        organizationId: orgId,
        code: a.code,
        name: a.name,
        type: a.type,
        isActive: true,
        isSystem: true,
        cashKind: a.cashKind,
      }));
      if (args?.where?.type) {
        return rows.filter((r) => r.type === args.where!.type);
      }
      return rows;
    });

    const service = new AccountingService(prisma as never);
    const report = await service.getProfitLoss(orgId, '2026-07-01', '2026-07-31');

    expect(report.totalRevenue).toBe(5000);
    expect(report.totalExpenses).toBe(2300);
    expect(report.netProfit).toBe(2700);
    expect(report.grossMargin).toBe(60);
  });
});
