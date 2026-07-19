import 'reflect-metadata';

import { InventoryOperationsService } from './inventory-operations.service';

const ORG = 'org-1';

function createMocks() {
  const tx = {
    inventoryPurchase: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    productVariant: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    inventoryStockMovement: {
      create: jest.fn(),
    },
  };
  const prisma = {
    inventorySupplier: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    inventoryPurchase: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    productVariant: {
      findMany: jest.fn(),
    },
    inventoryStockMovement: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const catalog = {
    adjustStock: jest.fn(),
  };
  return { prisma, catalog, tx };
}

describe('InventoryOperationsService', () => {
  const { prisma, catalog, tx } = createMocks();
  const service = new InventoryOperationsService(prisma as never, catalog as never);

  beforeEach(() => jest.clearAllMocks());

  it('maps manual stock movements to adjustment history', async () => {
    prisma.inventoryStockMovement.findMany.mockResolvedValue([
      {
        id: 'movement-1',
        productId: 'product-1',
        product: { name: 'Honey', sku: 'HNY-1' },
        previousStock: 10,
        delta: -2,
        newStock: 8,
        reason: 'damage',
        note: 'Broken jar',
        actorName: 'Admin',
        createdAt: new Date('2026-07-19T00:00:00.000Z'),
      },
    ]);

    const result = await service.listAdjustments(ORG);

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      productName: 'Honey',
      sku: 'HNY-1',
      reason: 'damage',
      adjustedBy: 'Admin',
    });
  });

  it('delegates stock adjustment to the transactional catalog ledger', async () => {
    catalog.adjustStock.mockResolvedValue({});

    await service.createAdjustment(
      ORG,
      {
        productId: 'product-1',
        delta: 3,
        reason: 'count_correction',
        note: 'Cycle count',
      },
      { userId: 'user-1', name: 'Admin' },
    );

    expect(catalog.adjustStock).toHaveBeenCalledWith(
      ORG,
      'product-1',
      {
        delta: 3,
        reason: 'count_correction',
        note: 'Cycle count',
      },
      { userId: 'user-1', name: 'Admin' },
    );
  });

  it('receives a purchase once and writes its stock movement', async () => {
    const purchase = {
      id: 'purchase-1',
      organizationId: ORG,
      purchaseNumber: 'PO-1',
      stockStatus: 'pending',
      lines: [
        {
          productId: 'product-1',
          variantId: 'variant-1',
          quantity: 5,
          unitCost: 100,
        },
      ],
    };
    tx.inventoryPurchase.findFirst.mockResolvedValue(purchase);
    tx.inventoryPurchase.updateMany.mockResolvedValue({ count: 1 });
    tx.productVariant.findFirst.mockResolvedValue({ id: 'variant-1', stock: 10 });
    prisma.inventoryPurchase.findFirst.mockResolvedValue({
      ...purchase,
      supplierId: 'supplier-1',
      supplier: { name: 'Supplier' },
      paymentStatus: 'unpaid',
      stockStatus: 'received',
      purchaseDate: new Date('2026-07-19T00:00:00.000Z'),
      dueDate: null,
      notes: null,
    });

    const result = await service.receivePurchase(ORG, 'purchase-1', {
      userId: 'user-1',
      name: 'Admin',
    });

    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'variant-1' },
      data: { stock: 15, costPrice: 100 },
    });
    expect(tx.inventoryStockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reason: 'purchase_received',
        delta: 5,
        previousStock: 10,
        newStock: 15,
      }),
    });
    expect(result.stockStatus).toBe('received');
  });
});
