import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AdjustmentReason,
  CreateAdjustmentPayload,
  CreatePurchasePayload,
  PurchaseListItem,
  PurchaseListResponse,
  StockAdjustmentListResponse,
  SupplierListResponse,
} from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';
import {
  type Actor,
  InventoryCatalogService,
  isUniqueConstraintError,
  toNumber,
} from './inventory-catalog.service';

const ADJUSTMENT_REASONS = [
  'damage',
  'expiry',
  'count_correction',
  'gift_sample',
  'theft_loss',
  'return_in',
  'other',
] as const satisfies readonly AdjustmentReason[];

@Injectable()
export class InventoryOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: InventoryCatalogService,
  ) {}

  async listSuppliers(organizationId: string, search?: string): Promise<SupplierListResponse> {
    const query = search?.trim();
    const rows = await this.prisma.inventorySupplier.findMany({
      where: {
        organizationId,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' as const } },
                { phone: { contains: query } },
                { contactPerson: { contains: query, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        purchases: {
          select: {
            paymentStatus: true,
            purchaseDate: true,
            lines: { select: { quantity: true, unitCost: true } },
          },
          orderBy: { purchaseDate: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      items: rows.map((supplier) => {
        const balance = supplier.purchases
          .filter((purchase) => purchase.paymentStatus !== 'paid')
          .reduce(
            (sum, purchase) =>
              sum +
              purchase.lines.reduce(
                (lineSum, line) => lineSum + line.quantity * toNumber(line.unitCost),
                0,
              ),
            0,
          );
        return {
          id: supplier.id,
          name: supplier.name,
          contactPerson: supplier.contactPerson ?? undefined,
          phone: supplier.phone,
          email: supplier.email ?? undefined,
          address: supplier.address ?? undefined,
          balance,
          productCount: 0,
          lastPurchaseAt: supplier.purchases[0]?.purchaseDate.toISOString(),
          status: supplier.status as 'active' | 'inactive',
          tags: supplier.tags,
        };
      }),
      total: rows.length,
    };
  }

  async listPurchases(
    organizationId: string,
    search?: string,
  ): Promise<PurchaseListResponse> {
    const query = search?.trim();
    const rows = await this.prisma.inventoryPurchase.findMany({
      where: {
        organizationId,
        ...(query
          ? {
              OR: [
                { purchaseNumber: { contains: query, mode: 'insensitive' as const } },
                { supplier: { name: { contains: query, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      include: {
        supplier: { select: { name: true } },
        lines: { select: { quantity: true, unitCost: true } },
      },
      orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
    });
    const items = rows.map((purchase) => this.toPurchaseListItem(purchase));

    return {
      items,
      total: items.length,
      summary: {
        unpaidTotal: items
          .filter((purchase) => purchase.paymentStatus !== 'paid')
          .reduce((sum, purchase) => sum + purchase.totalAmount, 0),
        pendingReceipt: items.filter((purchase) => purchase.stockStatus !== 'received').length,
      },
    };
  }

  async createPurchase(
    organizationId: string,
    input: CreatePurchasePayload,
  ): Promise<PurchaseListItem> {
    const purchaseNumber = input.purchaseNumber.trim().toUpperCase();
    const purchaseDate = this.parseDate(input.purchaseDate, 'purchaseDate');
    const dueDate = input.dueDate ? this.parseDate(input.dueDate, 'dueDate') : null;

    const supplier = await this.prisma.inventorySupplier.findFirst({
      where: { id: input.supplierId, organizationId, status: 'active' },
      select: { id: true },
    });
    if (!supplier) throw new BadRequestException('Invalid or inactive supplier');

    const uniqueVariantIds = [...new Set(input.lines.map((line) => line.variantId))];
    const variants = await this.prisma.productVariant.findMany({
      where: {
        id: { in: uniqueVariantIds },
        organizationId,
        product: { deletedAt: null },
      },
      select: { id: true, productId: true },
    });
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    for (const line of input.lines) {
      const variant = variantById.get(line.variantId);
      if (!variant || variant.productId !== line.productId) {
        throw new BadRequestException('A purchase line contains an invalid product variant');
      }
    }

    try {
      const created = await this.prisma.inventoryPurchase.create({
        data: {
          organizationId,
          supplierId: input.supplierId,
          purchaseNumber,
          paymentStatus: input.paymentStatus,
          stockStatus: 'pending',
          purchaseDate,
          dueDate,
          notes: input.notes?.trim() || null,
          lines: {
            create: input.lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              quantity: line.quantity,
              unitCost: new Prisma.Decimal(line.unitCost),
            })),
          },
        },
        include: {
          supplier: { select: { name: true } },
          lines: { select: { quantity: true, unitCost: true } },
        },
      });
      return this.toPurchaseListItem(created);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A purchase with this number already exists');
      }
      throw error;
    }
  }

  async receivePurchase(
    organizationId: string,
    purchaseId: string,
    actor?: Actor,
  ): Promise<PurchaseListItem> {
    await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.inventoryPurchase.findFirst({
        where: { id: purchaseId, organizationId },
        include: { lines: true },
      });
      if (!purchase) throw new NotFoundException('Purchase order not found');
      if (purchase.stockStatus === 'received') {
        throw new ConflictException(`${purchase.purchaseNumber} is already received`);
      }

      const claimed = await tx.inventoryPurchase.updateMany({
        where: { id: purchaseId, organizationId, stockStatus: { not: 'received' } },
        data: {
          stockStatus: 'received',
          receivedAt: new Date(),
          receivedById: actor?.userId ?? null,
          receivedByName: actor?.name ?? null,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(`${purchase.purchaseNumber} is already received`);
      }

      for (const line of purchase.lines) {
        const variant = await tx.productVariant.findFirst({
          where: {
            id: line.variantId,
            productId: line.productId,
            organizationId,
            product: { deletedAt: null },
          },
          select: { id: true, stock: true },
        });
        if (!variant) {
          throw new BadRequestException('Purchase contains a product variant that no longer exists');
        }
        const newStock = variant.stock + line.quantity;
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: newStock, costPrice: line.unitCost },
        });
        await tx.inventoryStockMovement.create({
          data: {
            organizationId,
            productId: line.productId,
            variantId: line.variantId,
            delta: line.quantity,
            previousStock: variant.stock,
            newStock,
            reason: 'purchase_received',
            note: `Received ${purchase.purchaseNumber}`,
            actorUserId: actor?.userId ?? null,
            actorName: actor?.name ?? null,
          },
        });
      }
    });

    const row = await this.prisma.inventoryPurchase.findFirst({
      where: { id: purchaseId, organizationId },
      include: {
        supplier: { select: { name: true } },
        lines: { select: { quantity: true, unitCost: true } },
      },
    });
    if (!row) throw new NotFoundException('Purchase order not found');
    return this.toPurchaseListItem(row);
  }

  async listAdjustments(organizationId: string): Promise<StockAdjustmentListResponse> {
    const rows = await this.prisma.inventoryStockMovement.findMany({
      where: {
        organizationId,
        reason: { in: [...ADJUSTMENT_REASONS] },
      },
      include: {
        product: { select: { name: true, sku: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        productId: row.productId,
        productName: row.product.name,
        sku: row.product.sku,
        previousStock: row.previousStock,
        delta: row.delta,
        newStock: row.newStock,
        reason: row.reason as AdjustmentReason,
        note: row.note ?? undefined,
        adjustedBy: row.actorName ?? 'System',
        adjustedAt: row.createdAt.toISOString(),
      })),
      total: rows.length,
    };
  }

  async createAdjustment(
    organizationId: string,
    input: CreateAdjustmentPayload,
    actor?: Actor,
  ): Promise<void> {
    if (!ADJUSTMENT_REASONS.includes(input.reason)) {
      throw new BadRequestException('Invalid adjustment reason');
    }
    await this.catalog.adjustStock(
      organizationId,
      input.productId,
      {
        delta: input.delta,
        reason: input.reason,
        note: input.note?.trim() || undefined,
      },
      actor,
    );
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }

  private toPurchaseListItem(purchase: {
    id: string;
    purchaseNumber: string;
    supplierId: string;
    supplier: { name: string };
    paymentStatus: string;
    stockStatus: string;
    purchaseDate: Date;
    dueDate: Date | null;
    notes: string | null;
    lines: { quantity: number; unitCost: unknown }[];
  }): PurchaseListItem {
    return {
      id: purchase.id,
      purchaseNumber: purchase.purchaseNumber,
      supplierName: purchase.supplier.name,
      supplierId: purchase.supplierId,
      itemCount: purchase.lines.reduce((sum, line) => sum + line.quantity, 0),
      totalAmount: purchase.lines.reduce(
        (sum, line) => sum + line.quantity * toNumber(line.unitCost),
        0,
      ),
      paymentStatus: purchase.paymentStatus as PurchaseListItem['paymentStatus'],
      stockStatus: purchase.stockStatus as PurchaseListItem['stockStatus'],
      purchaseDate: purchase.purchaseDate.toISOString().slice(0, 10),
      dueDate: purchase.dueDate?.toISOString().slice(0, 10),
      notes: purchase.notes ?? undefined,
    };
  }
}
