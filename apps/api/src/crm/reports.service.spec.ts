import 'reflect-metadata';

import { ReportsService } from './reports.service';

function createPrismaMock() {
  return {
    order: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    orderItem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    orderActivity: {
      groupBy: jest.fn().mockResolvedValue([]),
    },
    lead: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    customer: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    productVariant: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    inventoryPurchaseLine: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    loginAudit: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    marketingSpend: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    performanceTarget: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };
}

const sampleOrders = [
  {
    id: 'o1',
    status: 'delivered',
    amount: 2000,
    paidAmount: 2000,
    paymentMethod: 'cod',
    paymentStatus: 'paid',
    source: 'facebook',
    assignedAgentName: 'Sakib',
    orderDate: new Date('2026-07-20T10:00:00.000Z'),
    createdAt: new Date('2026-07-20T10:00:00.000Z'),
    customerId: 'c1',
    itemsCount: 2,
  },
  {
    id: 'o2',
    status: 'cancelled',
    amount: 1500,
    paidAmount: 0,
    paymentMethod: 'cod',
    paymentStatus: 'cod',
    source: 'facebook',
    assignedAgentName: 'Sakib',
    orderDate: new Date('2026-07-21T10:00:00.000Z'),
    createdAt: new Date('2026-07-21T10:00:00.000Z'),
    customerId: 'c2',
    itemsCount: 1,
  },
  {
    id: 'o3',
    status: 'confirmed',
    amount: 3000,
    paidAmount: 0,
    paymentMethod: 'bkash',
    paymentStatus: 'partial',
    source: 'website',
    assignedAgentName: 'Mitu',
    orderDate: new Date('2026-07-22T10:00:00.000Z'),
    createdAt: new Date('2026-07-22T10:00:00.000Z'),
    customerId: 'c3',
    itemsCount: 1,
  },
];

describe('ReportsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves 7d / 30d / ytd ranges', () => {
    const service = new ReportsService({} as never);
    const d7 = service.resolveRange('7d');
    const d30 = service.resolveRange('30d');
    const ytd = service.resolveRange('ytd');

    expect(d7.to.getTime() - d7.from.getTime()).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    expect(d30.to.getTime() - d30.from.getTime()).toBeGreaterThan(28 * 24 * 60 * 60 * 1000);
    expect(ytd.from.getMonth()).toBe(0);
    expect(ytd.from.getDate()).toBe(1);
  });

  it('builds summary from live orders excluding cancelled revenue', async () => {
    const prisma = createPrismaMock();
    prisma.order.findMany.mockResolvedValue(sampleOrders);
    prisma.lead.count.mockResolvedValueOnce(10).mockResolvedValueOnce(3);
    prisma.orderItem.findMany.mockResolvedValue([
      {
        productId: 'p1',
        productName: 'Honey Mix',
        sku: 'HM-1',
        quantity: 5,
        lineTotal: 5000,
      },
    ]);

    const service = new ReportsService(prisma as never);
    const summary = await service.getSummary('org_1', '30d');

    expect(summary.kpis.find((k) => k.id === 'orders')?.value).toBe('3');
    // revenue KPI uses booked non-cancelled = 2000+3000
    expect(summary.kpis.find((k) => k.id === 'revenue')?.value).toContain('5,000');
    expect(summary.topProducts[0]?.name).toBe('Honey Mix');
    expect(summary.topProducts[0]?.units).toBe(5);
  });

  it('sales KPIs count funnel statuses', async () => {
    const prisma = createPrismaMock();
    prisma.order.findMany.mockResolvedValue(sampleOrders);
    const service = new ReportsService(prisma as never);
    const sales = await service.getSales('org_1', '30d');

    expect(sales.kpis.find((k) => k.id === 'orders')?.value).toBe('3');
    expect(sales.kpis.find((k) => k.id === 'delivered')?.value).toBe('1');
    expect(sales.kpis.find((k) => k.id === 'cancelled')?.value).toBe('1');
    expect(sales.kpis.find((k) => k.id === 'confirmed')?.value).toBe('2');
  });

  it('aggregates agents by assignedAgentName', async () => {
    const prisma = createPrismaMock();
    prisma.order.findMany.mockResolvedValue(sampleOrders);
    const service = new ReportsService(prisma as never);
    const agents = await service.getEmployees('org_1', 'agents', '30d');

    expect(agents).toHaveLength(2);
    expect(agents[0]?.name).toBe('Mitu'); // higher non-cancelled revenue 3000
    expect(agents.find((a) => a.name === 'Sakib')?.orders).toBe(2);
  });

  it('lead sources merge leads + orders', async () => {
    const prisma = createPrismaMock();
    prisma.order.findMany.mockResolvedValue(sampleOrders);
    prisma.lead.groupBy.mockResolvedValue([
      { source: 'facebook', _count: { _all: 8 } },
      { source: 'website', _count: { _all: 4 } },
    ]);
    const service = new ReportsService(prisma as never);
    const sources = await service.getLeadSources('org_1', '30d');

    const fb = sources.find((s) => s.source === 'facebook');
    expect(fb?.leads).toBe(8);
    expect(fb?.orders).toBe(1); // cancelled excluded from revenue orders
    expect(fb?.revenueBdt).toBe(2000);
  });

  it('returns login history from audit rows', async () => {
    const prisma = createPrismaMock();
    prisma.loginAudit.findMany.mockResolvedValue([
      {
        id: 'la1',
        userName: 'Admin',
        email: 'e2e.admin@laam.test',
        ip: '127.0.0.1',
        device: 'device:test',
        loggedInAt: new Date('2026-07-28T10:00:00.000Z'),
        status: 'success',
      },
    ]);
    const service = new ReportsService(prisma as never);
    const rows = await service.getLoginHistory('org_1');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('success');
  });

  it('computes ROAS from manual marketing spend', async () => {
    const prisma = createPrismaMock();
    prisma.order.findMany.mockResolvedValue([
      {
        amount: 10000,
        utmCampaign: 'Summer Sale',
        orderDate: new Date('2026-07-15'),
      },
    ]);
    prisma.lead.count.mockResolvedValue(5);
    prisma.marketingSpend.findMany.mockResolvedValue([
      { campaignName: 'Summer Sale', spendBdt: 2000, monthKey: '2026-07' },
    ]);
    const service = new ReportsService(prisma as never);
    const report = await service.getMarketing('org_1', '30d');
    expect(report.spendBdt).toBe(2000);
    expect(report.roas).toBe(5);
    expect(report.campaigns[0]?.roas).toBe(5);
  });

  it('ranks low stock variants', async () => {
    const prisma = createPrismaMock();
    prisma.productVariant.findMany.mockResolvedValue([
      {
        id: 'v1',
        sku: 'SKU-1',
        stock: 2,
        reorderLevel: 5,
        product: { name: 'Low item' },
      },
    ]);
    const service = new ReportsService(prisma as never);
    const rows = await service.getRankedProducts('org_1', 'low-stock', '30d');
    expect(rows[0]?.value).toBe(2);
    expect(rows[0]?.name).toBe('Low item');
  });
});
