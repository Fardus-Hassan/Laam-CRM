import 'reflect-metadata';

import { InventoryOperationsService } from './inventory-operations.service';

const ORG = 'org-1';

function createMocks() {
  const tx = {
    inventoryPurchase: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    inventoryPurchaseLine: {
      update: jest.fn(),
      findMany: jest.fn(),
    },
    productVariant: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    inventoryStockMovement: {
      create: jest.fn(),
    },
    inventoryLot: {
      create: jest.fn(async (args) => ({ id: 'lot-1', ...args.data })),
    },
    inventoryStockLevel: {
      upsert: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(async () => [{ quantity: 5, receivedQuantity: 5 }]),
  };
  const prisma = {
    inventorySupplier: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    inventoryPurchase: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    productVariant: {
      findMany: jest.fn(),
    },
    inventoryStockMovement: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    inventoryPurchaseReturn: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const catalog = {
    adjustStock: jest.fn(),
  };
  const advanced = {
    ensureDefaultWarehouse: jest.fn(async () => ({ id: 'wh-main' })),
    postInventoryJournal: jest.fn(),
    applyWarehouseDelta: jest.fn(),
  };
  const uom = {
    convertToVariantBase: jest.fn(async (_org, _variantId, quantity) => ({
      baseQuantity: Math.round(quantity),
      uomCode: 'pcs',
      baseUomCode: 'pcs',
    })),
  };
  return { prisma, catalog, advanced, uom, tx };
}

describe('InventoryOperationsService', () => {
  const { prisma, catalog, advanced, uom, tx } = createMocks();
  const service = new InventoryOperationsService(
    prisma as never,
    catalog as never,
    advanced as never,
    uom as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('maps manual stock movements to adjustment history', async () => {
    prisma.inventoryStockMovement.count.mockResolvedValue(1);
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
          id: 'line-1',
          productId: 'product-1',
          variantId: 'variant-1',
          quantity: 5,
          receivedQuantity: 0,
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

    const result = await service.receivePurchase(ORG, 'purchase-1', {}, {
      userId: 'user-1',
      name: 'Admin',
    });

    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(advanced.applyWarehouseDelta).toHaveBeenCalledWith(
      tx,
      ORG,
      expect.objectContaining({
        warehouseId: 'wh-main',
        variantId: 'variant-1',
        delta: 5,
        reason: 'purchase_received',
      }),
    );
    expect(advanced.postInventoryJournal).toHaveBeenCalled();
    expect(result.stockStatus).toBe('received');
  });
});
