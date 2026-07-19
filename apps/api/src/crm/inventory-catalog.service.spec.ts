import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import {
  InventoryCatalogService,
  isUniqueConstraintError,
  slugify,
  stockStatusFor,
} from './inventory-catalog.service';

/**
 * Minimal prisma mock surface used by the tested public methods.
 * `$transaction` runs the callback against the same `tx` delegates so the
 * service's transactional writes can be asserted directly.
 */
function createPrismaMock() {
  const tx = {
    productBrand: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    productVariant: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    inventoryStockMovement: {
      create: jest.fn(),
    },
    catalogActivity: {
      create: jest.fn(),
    },
    orgCategory: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const prisma = {
    productBrand: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    product: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    productVariant: {
      findFirst: jest.fn(),
    },
    inventoryStockMovement: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    orgCategory: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
    $queryRaw: jest.fn(),
  };

  return { prisma, tx };
}

const ORG = 'org-1';

describe('InventoryCatalogService', () => {
  let prisma: ReturnType<typeof createPrismaMock>['prisma'];
  let tx: ReturnType<typeof createPrismaMock>['tx'];
  let service: InventoryCatalogService;

  beforeEach(() => {
    ({ prisma, tx } = createPrismaMock());
    service = new InventoryCatalogService(prisma as never);
  });

  describe('requireOrg', () => {
    it('throws ForbiddenException without an organization', () => {
      expect(() => service.requireOrg(null)).toThrow(ForbiddenException);
      expect(() => service.requireOrg(undefined)).toThrow(ForbiddenException);
      expect(() => service.requireOrg('')).toThrow(ForbiddenException);
    });

    it('passes with an organization id', () => {
      expect(() => service.requireOrg(ORG)).not.toThrow();
    });
  });

  describe('unique constraint handling', () => {
    it('isUniqueConstraintError only matches prisma P2002 errors', () => {
      expect(isUniqueConstraintError({ code: 'P2002' })).toBe(true);
      expect(isUniqueConstraintError({ code: 'P2025' })).toBe(false);
      expect(isUniqueConstraintError(new Error('boom'))).toBe(false);
      expect(isUniqueConstraintError(null)).toBe(false);
      expect(isUniqueConstraintError('P2002')).toBe(false);
    });

    it('createBrand maps P2002 to a ConflictException with a friendly message', async () => {
      tx.productBrand.create.mockRejectedValue({ code: 'P2002' });

      const error = await service
        .createBrand(ORG, { name: 'Sundarban Honey' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toBe(
        'A brand with this slug already exists',
      );
    });

    it('createBrand rethrows non-unique-constraint errors untouched', async () => {
      const dbDown = new Error('connection lost');
      tx.productBrand.create.mockRejectedValue(dbDown);

      await expect(service.createBrand(ORG, { name: 'Brand' })).rejects.toBe(dbDown);
    });

    it('createBrand slugifies the name and logs activity on success', async () => {
      const row = {
        id: 'brand-1',
        organizationId: ORG,
        name: 'Sundarban Honey',
        slug: 'sundarban_honey',
        description: null,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };
      tx.productBrand.create.mockResolvedValue(row);

      const brand = await service.createBrand(ORG, { name: '  Sundarban Honey  ' });

      expect(tx.productBrand.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: ORG,
          name: 'Sundarban Honey',
          slug: 'sundarban_honey',
        }),
      });
      expect(tx.catalogActivity.create).toHaveBeenCalledTimes(1);
      expect(brand).toMatchObject({ id: 'brand-1', slug: 'sundarban_honey' });
    });
  });

  describe('deleteBrand', () => {
    it('is blocked while active products still reference the brand', async () => {
      prisma.productBrand.findFirst.mockResolvedValue({ id: 'brand-1', name: 'Honey Co', deletedAt: null });
      prisma.product.count.mockResolvedValue(3);

      const error = await service.deleteBrand(ORG, 'brand-1').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toContain('Cannot delete brand');
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { brandId: 'brand-1', deletedAt: null },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('soft-deletes when no active product references the brand', async () => {
      prisma.productBrand.findFirst.mockResolvedValue({ id: 'brand-1', name: 'Honey Co', deletedAt: null });
      prisma.product.count.mockResolvedValue(0);

      await service.deleteBrand(ORG, 'brand-1');

      expect(tx.productBrand.update).toHaveBeenCalledWith({
        where: { id: 'brand-1' },
        data: expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
      });
      expect(tx.catalogActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'brand',
          action: 'soft_deleted',
        }),
      });
    });
  });

  describe('restoreProduct', () => {
    it('clears deletedAt for an archived product', async () => {
      prisma.product.findFirst
        .mockResolvedValueOnce({
          id: 'prod-1',
          name: 'Honey Jar',
          sku: 'HJ-1',
          deletedAt: new Date(),
        })
        .mockResolvedValueOnce(null); // no SKU conflict

      const restoreSpy = jest.spyOn(service, 'getProduct').mockResolvedValue({
        id: 'prod-1',
        name: 'Honey Jar',
        sku: 'HJ-1',
        category: 'other',
        status: 'inactive',
        stock: 0,
        reorderLevel: 5,
        stockStatus: 'out_of_stock',
        variantCount: 0,
        salePriceMin: 0,
        salePriceMax: 0,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        variants: [],
        activities: [],
      } as never);

      await service.restoreProduct(ORG, 'prod-1', { userId: 'u1', name: 'Admin' });

      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { deletedAt: null, status: 'inactive' },
      });
      expect(tx.catalogActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'restored' }),
      });
      restoreSpy.mockRestore();
    });
  });

  describe('adjustStock', () => {
    it('rejects a zero delta before touching the database', async () => {
      await expect(
        service.adjustStock(ORG, 'prod-1', { delta: 0, reason: 'manual_adjustment' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a non-integer delta', async () => {
      await expect(
        service.adjustStock(ORG, 'prod-1', { delta: 1.5, reason: 'manual_adjustment' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a decrement that would drive stock below zero', async () => {
      tx.product.findFirst.mockResolvedValue({ id: 'prod-1' });
      // Guarded updateMany matches nothing because stock < |delta| …
      tx.productVariant.updateMany.mockResolvedValue({ count: 0 });
      // … but the variant itself exists, so this is an insufficient-stock case.
      tx.productVariant.findFirst.mockResolvedValue({ id: 'var-1' });

      const error = await service
        .adjustStock(ORG, 'prod-1', { variantId: 'var-1', delta: -10, reason: 'damage' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toBe(
        'Insufficient stock for this adjustment',
      );

      expect(tx.productVariant.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: 'var-1',
          productId: 'prod-1',
          organizationId: ORG,
          stock: { gte: 10 },
        }),
        data: { stock: { increment: -10 } },
      });
      expect(tx.inventoryStockMovement.create).not.toHaveBeenCalled();
    });
  });

  describe('softDeleteProduct', () => {
    it('sets deletedAt and discontinues the product', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'prod-1', name: 'Honey Jar' });

      await service.softDeleteProduct(ORG, 'prod-1', { userId: 'u1', name: 'Admin' });

      expect(tx.product.update).toHaveBeenCalledTimes(1);
      const updateArgs = tx.product.update.mock.calls[0][0];
      expect(updateArgs.where).toEqual({ id: 'prod-1' });
      expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
      expect(updateArgs.data.status).toBe('discontinued');
      expect(tx.catalogActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'product',
          action: 'soft_deleted',
          actorUserId: 'u1',
        }),
      });
    });

    it('throws NotFound for missing or already deleted products', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      const error = await service.softDeleteProduct(ORG, 'ghost').catch((e: unknown) => e);

      expect((error as Error).message).toBe('Product not found');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('pure helpers', () => {
    it('slugify normalizes arbitrary labels', () => {
      expect(slugify('  Gift Box #1  ')).toBe('gift_box_1');
      expect(slugify('!!!')).toBe('item');
    });

    it('stockStatusFor buckets stock levels', () => {
      expect(stockStatusFor(0, 5)).toBe('out_of_stock');
      expect(stockStatusFor(3, 5)).toBe('low_stock');
      expect(stockStatusFor(50, 5)).toBe('in_stock');
    });
  });
});
