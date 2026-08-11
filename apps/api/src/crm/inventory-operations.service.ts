import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import type {
  AdjustmentReason,
  CreateAdjustmentPayload,
  CreateMixerRecipePayload,
  CreatePurchasePayload,
  CreatePurchaseReturnPayload,
  CreateSupplierPayload,
  MixerRecipeListItem,
  MixerRecipeListResponse,
  ProductionBatchListResponse,
  ProductionBatchResult,
  ProductionPreviewResult,
  PurchaseDetail,
  PurchaseListItem,
  PurchaseListResponse,
  PurchasePaymentStatus,
  PurchaseReturnDetail,
  PurchaseReturnListItem,
  PurchaseReturnListResponse,
  ReceivePurchasePayload,
  RunProductionBatchPayload,
  StockAdjustmentListResponse,
  SupplierListItem,
  SupplierListResponse,
  UpdateMixerRecipePayload,
  UpdatePurchasePayload,
  UpdateSupplierPayload,
} from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from './accounting.service';
import { InventoryAdvancedService } from './inventory-advanced.service';
import { InventoryCatalogService } from './inventory-catalog.service';
import {
  type Actor,
  isUniqueConstraintError,
  toNumber,
} from './inventory-shared';
import { InventoryUomService } from './inventory-uom.service';

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
    private readonly advanced: InventoryAdvancedService,
    private readonly uom: InventoryUomService,
    private readonly accounting: AccountingService,
  ) {}

  async listSuppliers(
    organizationId: string,
    opts?: { search?: string; page?: number; pageSize?: number },
  ): Promise<SupplierListResponse> {
    const query = opts?.search?.trim();
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 50));
    const where = {
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
    };
    const [total, rows] = await Promise.all([
      this.prisma.inventorySupplier.count({ where }),
      this.prisma.inventorySupplier.findMany({
        where,
        include: {
          purchases: {
            select: {
              paymentStatus: true,
              stockStatus: true,
              purchaseDate: true,
              lines: { select: { quantity: true, unitCost: true, productId: true } },
            },
            orderBy: { purchaseDate: 'desc' },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((supplier) => this.toSupplierListItem(supplier)),
      total,
      page,
      pageSize,
    };
  }

  async createSupplier(
    organizationId: string,
    input: CreateSupplierPayload,
  ): Promise<SupplierListItem> {
    const name = input.name.trim();
    if (!name) throw new BadRequestException('Supplier name is required');
    const phone = input.phone.trim();
    if (!phone) throw new BadRequestException('Supplier phone is required');

    try {
      const created = await this.prisma.inventorySupplier.create({
        data: {
          organizationId,
          name,
          contactPerson: input.contactPerson?.trim() || null,
          phone,
          email: input.email?.trim() || null,
          address: input.address?.trim() || null,
          status: input.status ?? 'active',
          tags: input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
        },
        include: {
          purchases: {
            select: {
              paymentStatus: true,
              stockStatus: true,
              purchaseDate: true,
              lines: { select: { quantity: true, unitCost: true, productId: true } },
            },
            orderBy: { purchaseDate: 'desc' },
          },
        },
      });
      return this.toSupplierListItem(created);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A supplier with this name already exists');
      }
      throw error;
    }
  }

  async updateSupplier(
    organizationId: string,
    supplierId: string,
    input: UpdateSupplierPayload,
  ): Promise<SupplierListItem> {
    const existing = await this.prisma.inventorySupplier.findFirst({
      where: { id: supplierId, organizationId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Supplier not found');

    try {
      const updated = await this.prisma.inventorySupplier.update({
        where: { id: supplierId },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.contactPerson !== undefined
            ? { contactPerson: input.contactPerson.trim() || null }
            : {}),
          ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
          ...(input.email !== undefined ? { email: input.email.trim() || null } : {}),
          ...(input.address !== undefined ? { address: input.address.trim() || null } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.tags !== undefined
            ? { tags: input.tags.map((tag) => tag.trim()).filter(Boolean) }
            : {}),
        },
        include: {
          purchases: {
            select: {
              paymentStatus: true,
              stockStatus: true,
              purchaseDate: true,
              lines: { select: { quantity: true, unitCost: true, productId: true } },
            },
            orderBy: { purchaseDate: 'desc' },
          },
        },
      });
      return this.toSupplierListItem(updated);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A supplier with this name already exists');
      }
      throw error;
    }
  }

  async deleteSupplier(organizationId: string, supplierId: string): Promise<void> {
    const existing = await this.prisma.inventorySupplier.findFirst({
      where: { id: supplierId, organizationId },
      select: { id: true, _count: { select: { purchases: true } } },
    });
    if (!existing) throw new NotFoundException('Supplier not found');
    if (existing._count.purchases > 0) {
      throw new ConflictException(
        'Supplier has purchase history — mark inactive instead of deleting',
      );
    }
    await this.prisma.inventorySupplier.delete({ where: { id: supplierId } });
  }

  async listPurchases(
    organizationId: string,
    opts?: { search?: string; page?: number; pageSize?: number; stockStatus?: string },
  ): Promise<PurchaseListResponse> {
    const query = opts?.search?.trim();
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 50));
    const where: Prisma.InventoryPurchaseWhereInput = {
      organizationId,
      ...(opts?.stockStatus ? { stockStatus: opts.stockStatus } : {}),
      ...(query
        ? {
            OR: [
              { purchaseNumber: { contains: query, mode: 'insensitive' as const } },
              { supplier: { name: { contains: query, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [total, rows, unpaidAgg, pendingReceipt] = await Promise.all([
      this.prisma.inventoryPurchase.count({ where }),
      this.prisma.inventoryPurchase.findMany({
        where,
        include: {
          supplier: { select: { name: true } },
          lines: { select: { quantity: true, unitCost: true } },
        },
        orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.inventoryPurchase.findMany({
        where: {
          organizationId,
          stockStatus: { not: 'cancelled' },
          paymentStatus: { not: 'paid' },
        },
        include: { lines: { select: { quantity: true, unitCost: true } } },
      }),
      this.prisma.inventoryPurchase.count({
        where: { organizationId, stockStatus: { in: ['pending', 'partial'] } },
      }),
    ]);
    const items = rows.map((purchase) => this.toPurchaseListItem(purchase));

    return {
      items,
      total,
      page,
      pageSize,
      summary: {
        unpaidTotal: unpaidAgg.reduce(
          (sum, purchase) =>
            sum +
            purchase.lines.reduce(
              (lineSum, line) => lineSum + line.quantity * toNumber(line.unitCost),
              0,
            ),
          0,
        ),
        pendingReceipt,
      },
    };
  }

  async getPurchase(organizationId: string, purchaseId: string): Promise<PurchaseDetail> {
    const purchase = await this.prisma.inventoryPurchase.findFirst({
      where: { id: purchaseId, organizationId },
      include: {
        supplier: { select: { name: true } },
        lines: {
          include: {
            product: { select: { name: true, sku: true } },
            variant: { select: { label: true, sku: true } },
          },
        },
      },
    });
    if (!purchase) throw new NotFoundException('Purchase order not found');

    let receivedRows: Array<{ id: string; receivedQuantity: number }> = [];
    try {
      receivedRows = await this.prisma.$queryRaw<Array<{ id: string; receivedQuantity: number }>>`
        SELECT id, COALESCE("receivedQuantity", 0)::int AS "receivedQuantity"
        FROM "InventoryPurchaseLine"
        WHERE "purchaseId" = ${purchaseId}
      `;
    } catch {
      receivedRows = [];
    }
    const receivedById = new Map(receivedRows.map((row) => [row.id, row.receivedQuantity]));

    return this.toPurchaseDetail({
      ...purchase,
      lines: purchase.lines.map((line) => ({
        ...line,
        receivedQuantity: receivedById.get(line.id) ?? 0,
      })),
    });
  }

  async updatePurchasePayment(
    organizationId: string,
    purchaseId: string,
    paymentStatus: PurchasePaymentStatus,
  ): Promise<PurchaseListItem> {
    const existing = await this.prisma.inventoryPurchase.findFirst({
      where: { id: purchaseId, organizationId },
      select: { id: true, stockStatus: true, paymentStatus: true },
    });
    if (!existing) throw new NotFoundException('Purchase order not found');
    if (existing.stockStatus === 'cancelled') {
      throw new ConflictException('Cannot update payment on a cancelled purchase');
    }

    // Paid → post AP settlement journal (idempotent). Unpaid/partial stay ops-only.
    if (paymentStatus === 'paid') {
      await this.accounting.postPurchasePayment(organizationId, purchaseId, 'cash');
    } else if (existing.paymentStatus === 'paid') {
      throw new BadRequestException(
        'Purchase is already marked paid in the ledger. Reverse via Accounting if needed — cannot unpay from Inventory.',
      );
    }

    const updated = await this.prisma.inventoryPurchase.update({
      where: { id: purchaseId },
      data: { paymentStatus },
      include: {
        supplier: { select: { name: true } },
        lines: { select: { quantity: true, unitCost: true } },
      },
    });
    return this.toPurchaseListItem(updated);
  }

  async cancelPurchase(organizationId: string, purchaseId: string): Promise<PurchaseListItem> {
    const claimed = await this.prisma.inventoryPurchase.updateMany({
      where: { id: purchaseId, organizationId, stockStatus: 'pending' },
      data: { stockStatus: 'cancelled' },
    });
    if (claimed.count !== 1) {
      const existing = await this.prisma.inventoryPurchase.findFirst({
        where: { id: purchaseId, organizationId },
        select: { id: true, purchaseNumber: true, stockStatus: true },
      });
      if (!existing) throw new NotFoundException('Purchase order not found');
      throw new ConflictException(
        existing.stockStatus === 'cancelled'
          ? `${existing.purchaseNumber} is already cancelled`
          : `Only pending purchases can be cancelled (${existing.purchaseNumber} is ${existing.stockStatus})`,
      );
    }

    const row = await this.prisma.inventoryPurchase.findFirstOrThrow({
      where: { id: purchaseId, organizationId },
      include: {
        supplier: { select: { name: true } },
        lines: { select: { quantity: true, unitCost: true } },
      },
    });
    return this.toPurchaseListItem(row);
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
      const normalizedLines = await Promise.all(
        input.lines.map(async (line) => {
          const { baseQuantity } = await this.uom.convertToVariantBase(
            organizationId,
            line.variantId,
            line.quantity,
            { uomId: line.uomId, uomCode: line.uomCode },
          );
          return {
            productId: line.productId,
            variantId: line.variantId,
            quantity: baseQuantity,
            unitCost: new Prisma.Decimal(line.unitCost),
          };
        }),
      );

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
            create: normalizedLines,
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

  async updatePurchase(
    organizationId: string,
    purchaseId: string,
    input: UpdatePurchasePayload,
  ): Promise<PurchaseDetail> {
    const existing = await this.prisma.inventoryPurchase.findFirst({
      where: { id: purchaseId, organizationId },
      include: { lines: true },
    });
    if (!existing) throw new NotFoundException('Purchase order not found');
    if (existing.stockStatus !== 'pending') {
      throw new ConflictException(
        `Only pending purchases can be edited (${existing.purchaseNumber} is ${existing.stockStatus})`,
      );
    }
    if (existing.lines.some((line) => ((line as { receivedQuantity?: number }).receivedQuantity ?? 0) > 0)) {
      throw new ConflictException('Cannot edit a purchase after stock has been received');
    }

    if (input.supplierId) {
      const supplier = await this.prisma.inventorySupplier.findFirst({
        where: { id: input.supplierId, organizationId, status: 'active' },
        select: { id: true },
      });
      if (!supplier) throw new BadRequestException('Invalid or inactive supplier');
    }

    let normalizedLines:
      | Array<{
          productId: string;
          variantId: string;
          quantity: number;
          unitCost: Prisma.Decimal;
        }>
      | undefined;

    if (input.lines) {
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
      normalizedLines = await Promise.all(
        input.lines.map(async (line) => {
          const { baseQuantity } = await this.uom.convertToVariantBase(
            organizationId,
            line.variantId,
            line.quantity,
            { uomId: line.uomId, uomCode: line.uomCode },
          );
          return {
            productId: line.productId,
            variantId: line.variantId,
            quantity: baseQuantity,
            unitCost: new Prisma.Decimal(line.unitCost),
          };
        }),
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        if (normalizedLines) {
          await tx.inventoryPurchaseLine.deleteMany({ where: { purchaseId } });
        }
        await tx.inventoryPurchase.update({
          where: { id: purchaseId },
          data: {
            ...(input.supplierId ? { supplierId: input.supplierId } : {}),
            ...(input.purchaseNumber
              ? { purchaseNumber: input.purchaseNumber.trim().toUpperCase() }
              : {}),
            ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {}),
            ...(input.purchaseDate
              ? { purchaseDate: this.parseDate(input.purchaseDate, 'purchaseDate') }
              : {}),
            ...(input.dueDate !== undefined
              ? {
                  dueDate: input.dueDate
                    ? this.parseDate(input.dueDate, 'dueDate')
                    : null,
                }
              : {}),
            ...(input.notes !== undefined
              ? { notes: input.notes?.trim() ? input.notes.trim() : null }
              : {}),
            ...(normalizedLines
              ? {
                  lines: {
                    create: normalizedLines,
                  },
                }
              : {}),
          },
        });
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A purchase with this number already exists');
      }
      throw error;
    }

    return this.getPurchase(organizationId, purchaseId);
  }

  async receivePurchase(
    organizationId: string,
    purchaseId: string,
    input: ReceivePurchasePayload = {},
    actor?: Actor,
  ): Promise<PurchaseListItem> {
    const receiptId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.inventoryPurchase.findFirst({
        where: { id: purchaseId, organizationId },
        include: { lines: true, supplier: { select: { name: true } } },
      });
      if (!purchase) throw new NotFoundException('Purchase order not found');
      if (purchase.stockStatus === 'received') {
        throw new ConflictException(`${purchase.purchaseNumber} is already fully received`);
      }
      if (purchase.stockStatus === 'cancelled') {
        throw new ConflictException(`${purchase.purchaseNumber} is cancelled`);
      }

      const claimed = await tx.inventoryPurchase.updateMany({
        where: {
          id: purchaseId,
          organizationId,
          stockStatus: { in: ['pending', 'partial'] },
        },
        data: {
          receivedAt: new Date(),
          receivedById: actor?.userId ?? null,
          receivedByName: actor?.name ?? null,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(
          `${purchase.purchaseNumber} cannot be received in its current state`,
        );
      }

      let warehouse =
        input.warehouseId != null
          ? await tx.warehouse.findFirst({
              where: { id: input.warehouseId, organizationId, isActive: true },
            })
          : null;
      if (input.warehouseId && !warehouse) {
        throw new BadRequestException('Invalid or inactive warehouse');
      }
      warehouse ??= await this.advanced.ensureDefaultWarehouse(organizationId, tx);

      const receiveByLineId = new Map(
        (input.lines ?? []).map((line) => [line.lineId, line] as const),
      );
      const receiveAllRemaining = !input.lines?.length;

      const lines = purchase.lines as Array<{
        id: string;
        productId: string;
        variantId: string;
        quantity: number;
        receivedQuantity?: number;
        unitCost: unknown;
      }>;

      let inventoryAmount = 0;
      let receivedAny = false;

      for (const line of lines) {
        const alreadyReceived = line.receivedQuantity ?? 0;
        const remaining = Math.max(0, line.quantity - alreadyReceived);
        if (remaining <= 0) continue;

        const requested = receiveAllRemaining
          ? remaining
          : (receiveByLineId.get(line.id)?.quantity ?? 0);
        if (requested <= 0) continue;
        if (!Number.isInteger(requested)) {
          throw new BadRequestException('Receive quantity must be a whole number');
        }
        if (requested > remaining) {
          throw new BadRequestException(
            `Cannot receive ${requested} for line ${line.id.slice(0, 8)} — only ${remaining} remaining`,
          );
        }

        const expiresAtRaw = receiveByLineId.get(line.id)?.expiresAt;
        const expiresAt = expiresAtRaw?.trim()
          ? this.parseDate(expiresAtRaw, 'expiresAt')
          : null;

        const variant = await tx.productVariant.findFirst({
          where: {
            id: line.variantId,
            productId: line.productId,
            organizationId,
            product: { deletedAt: null },
          },
          select: { id: true },
        });
        if (!variant) {
          throw new BadRequestException('Purchase contains a product variant that no longer exists');
        }

        const unitCost = toNumber(line.unitCost);
        inventoryAmount += requested * unitCost;
        receivedAny = true;

        const lotNumber =
          `PO-${purchase.purchaseNumber}-${line.id.slice(0, 8)}-${receiptId.slice(0, 8)}`.toUpperCase();
        const lot = await tx.inventoryLot.create({
          data: {
            organizationId,
            variantId: line.variantId,
            warehouseId: warehouse.id,
            lotNumber,
            quantity: requested,
            unitCost: line.unitCost as Prisma.Decimal,
            receivedAt: new Date(),
            expiresAt,
            status: 'active',
          },
        });

        await tx.$executeRaw`
          UPDATE "InventoryPurchaseLine"
          SET "receivedQuantity" = COALESCE("receivedQuantity", 0) + ${requested}
          WHERE "id" = ${line.id}
        `;

        await tx.productVariant.update({
          where: { id: variant.id },
          data: { costPrice: line.unitCost as Prisma.Decimal },
        });

        await this.advanced.applyWarehouseDelta(tx, organizationId, {
          warehouseId: warehouse.id,
          productId: line.productId,
          variantId: line.variantId,
          delta: requested,
          reason: 'purchase_received',
          note: `Received ${purchase.purchaseNumber}`,
          unitCost,
          lotId: lot.id,
          sourceType: 'purchase',
          sourceId: purchase.id,
          actor,
        });
      }

      if (!receivedAny) {
        throw new BadRequestException('No quantities selected to receive');
      }

      const refreshedLines = await tx.$queryRaw<
        Array<{ quantity: number; receivedQuantity: number }>
      >`
        SELECT quantity, COALESCE("receivedQuantity", 0)::int AS "receivedQuantity"
        FROM "InventoryPurchaseLine"
        WHERE "purchaseId" = ${purchaseId}
      `;
      const fullyReceived = refreshedLines.every(
        (line) => line.receivedQuantity >= line.quantity,
      );
      await tx.inventoryPurchase.update({
        where: { id: purchaseId },
        data: { stockStatus: fullyReceived ? 'received' : 'partial' },
      });

      await this.advanced.postInventoryJournal(tx, organizationId, {
        eventKey: `purchase-receipt:${purchase.id}:${receiptId}`,
        sourceType: 'purchase',
        sourceId: purchase.id,
        description: `Stock received ${purchase.purchaseNumber}`,
        reference: purchase.purchaseNumber,
        amount: inventoryAmount,
        kind: 'purchase_receive',
      });
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

  async listAdjustments(
    organizationId: string,
    opts?: { page?: number; pageSize?: number; search?: string },
  ): Promise<StockAdjustmentListResponse> {
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 50));
    const query = opts?.search?.trim();
    const where: Prisma.InventoryStockMovementWhereInput = {
      organizationId,
      reason: { in: [...ADJUSTMENT_REASONS] },
      ...(query
        ? {
            OR: [
              { product: { name: { contains: query, mode: 'insensitive' as const } } },
              { product: { sku: { contains: query, mode: 'insensitive' as const } } },
              { note: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.inventoryStockMovement.count({ where }),
      this.prisma.inventoryStockMovement.findMany({
        where,
        include: {
          product: { select: { name: true, sku: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

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
      total,
      page,
      pageSize,
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

    let delta = Math.trunc(input.delta);
    if ((input.uomId || input.uomCode?.trim()) && input.variantId) {
      const sign = delta < 0 ? -1 : 1;
      const magnitude = Math.abs(delta) || Math.abs(input.delta);
      const { baseQuantity } = await this.uom.convertToVariantBase(
        organizationId,
        input.variantId,
        magnitude,
        { uomId: input.uomId, uomCode: input.uomCode },
      );
      delta = sign * baseQuantity;
    }

    await this.catalog.adjustStock(
      organizationId,
      input.productId,
      {
        variantId: input.variantId,
        delta,
        reason: input.reason,
        note: input.note?.trim() || undefined,
      },
      actor,
    );
  }

  // ─── Purchase returns ─────────────────────────────────────────────────────

  async listPurchaseReturns(
    organizationId: string,
    opts?: { page?: number; pageSize?: number; search?: string },
  ): Promise<PurchaseReturnListResponse> {
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 50));
    const query = opts?.search?.trim();
    const where: Prisma.InventoryPurchaseReturnWhereInput = {
      organizationId,
      ...(query
        ? {
            OR: [
              { returnNumber: { contains: query, mode: 'insensitive' as const } },
              { purchaseNumber: { contains: query, mode: 'insensitive' as const } },
              { supplierName: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.inventoryPurchaseReturn.count({ where }),
      this.prisma.inventoryPurchaseReturn.findMany({
        where,
        include: { lines: { select: { quantity: true, unitCost: true } } },
        orderBy: [{ returnDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => this.toPurchaseReturnListItem(row)),
      total,
      page,
      pageSize,
    };
  }

  async getPurchaseReturn(
    organizationId: string,
    returnId: string,
  ): Promise<PurchaseReturnDetail> {
    const row = await this.prisma.inventoryPurchaseReturn.findFirst({
      where: { id: returnId, organizationId },
      include: {
        lines: {
          include: {
            product: { select: { name: true, sku: true } },
            variant: { select: { label: true, sku: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Purchase return not found');
    return this.toPurchaseReturnDetail(row);
  }

  async createPurchaseReturn(
    organizationId: string,
    input: CreatePurchaseReturnPayload,
  ): Promise<PurchaseReturnListItem> {
    const returnNumber = input.returnNumber.trim().toUpperCase();
    const purchaseNumber = input.purchaseNumber.trim().toUpperCase();
    const returnDate = this.parseDate(input.returnDate, 'returnDate');

    let purchaseId: string | null = null;
    if (input.purchaseId) {
      const purchase = await this.prisma.inventoryPurchase.findFirst({
        where: { id: input.purchaseId, organizationId },
        select: { id: true, purchaseNumber: true, supplier: { select: { name: true } } },
      });
      if (!purchase) throw new BadRequestException('Linked purchase order not found');
      purchaseId = purchase.id;
      if (purchase.purchaseNumber !== purchaseNumber) {
        throw new BadRequestException('Purchase number does not match the selected purchase');
      }
    }

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
        throw new BadRequestException('A return line contains an invalid product variant');
      }
    }

    try {
      const normalizedLines = await Promise.all(
        input.lines.map(async (line) => {
          const { baseQuantity } = await this.uom.convertToVariantBase(
            organizationId,
            line.variantId,
            line.quantity,
            { uomId: line.uomId, uomCode: line.uomCode },
          );
          return {
            productId: line.productId,
            variantId: line.variantId,
            quantity: baseQuantity,
            unitCost: new Prisma.Decimal(line.unitCost),
          };
        }),
      );

      const created = await this.prisma.inventoryPurchaseReturn.create({
        data: {
          organizationId,
          purchaseId,
          returnNumber,
          purchaseNumber,
          supplierName: input.supplierName.trim(),
          status: 'pending',
          returnDate,
          reason: input.reason?.trim() || null,
          lines: {
            create: normalizedLines,
          },
        },
        include: { lines: { select: { quantity: true, unitCost: true } } },
      });
      return this.toPurchaseReturnListItem(created);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A purchase return with this number already exists');
      }
      throw error;
    }
  }

  async rejectPurchaseReturn(
    organizationId: string,
    returnId: string,
  ): Promise<PurchaseReturnListItem> {
    const existing = await this.prisma.inventoryPurchaseReturn.findFirst({
      where: { id: returnId, organizationId },
      include: { lines: { select: { quantity: true, unitCost: true } } },
    });
    if (!existing) throw new NotFoundException('Purchase return not found');
    if (existing.status === 'completed') {
      throw new ConflictException(`${existing.returnNumber} is already completed`);
    }
    if (existing.status === 'rejected') {
      throw new ConflictException(`${existing.returnNumber} is already rejected`);
    }

    const claimed = await this.prisma.inventoryPurchaseReturn.updateMany({
      where: {
        id: returnId,
        organizationId,
        status: { in: ['pending', 'approved'] },
      },
      data: { status: 'rejected' },
    });
    if (claimed.count !== 1) {
      throw new ConflictException(`${existing.returnNumber} could not be rejected`);
    }

    return this.toPurchaseReturnListItem({ ...existing, status: 'rejected' });
  }

  async approvePurchaseReturn(
    organizationId: string,
    returnId: string,
  ): Promise<PurchaseReturnListItem> {
    const existing = await this.prisma.inventoryPurchaseReturn.findFirst({
      where: { id: returnId, organizationId },
      include: { lines: { select: { quantity: true, unitCost: true } } },
    });
    if (!existing) throw new NotFoundException('Purchase return not found');
    if (existing.status === 'completed') {
      throw new ConflictException(`${existing.returnNumber} is already completed`);
    }
    if (existing.status === 'approved') {
      throw new ConflictException(`${existing.returnNumber} is already approved`);
    }

    const claimed = await this.prisma.inventoryPurchaseReturn.updateMany({
      where: { id: returnId, organizationId, status: 'pending' },
      data: { status: 'approved' },
    });
    if (claimed.count !== 1) {
      throw new ConflictException(`${existing.returnNumber} could not be approved`);
    }

    return this.toPurchaseReturnListItem({ ...existing, status: 'approved' });
  }

  async completePurchaseReturn(
    organizationId: string,
    returnId: string,
    actor?: Actor,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const purchaseReturn = await tx.inventoryPurchaseReturn.findFirst({
        where: { id: returnId, organizationId },
        include: { lines: true },
      });
      if (!purchaseReturn) throw new NotFoundException('Purchase return not found');
      if (purchaseReturn.status === 'completed') {
        throw new ConflictException(`${purchaseReturn.returnNumber} is already completed`);
      }
      if (!['pending', 'approved'].includes(purchaseReturn.status)) {
        throw new ConflictException(
          `${purchaseReturn.returnNumber} cannot be completed from status ${purchaseReturn.status}`,
        );
      }

      const claimed = await tx.inventoryPurchaseReturn.updateMany({
        where: {
          id: returnId,
          organizationId,
          status: { in: ['pending', 'approved'] },
        },
        data: { status: 'completed', completedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(`${purchaseReturn.returnNumber} is already completed`);
      }

      for (const line of purchaseReturn.lines) {
        await this.applyVariantDelta(tx, organizationId, {
          productId: line.productId,
          variantId: line.variantId,
          delta: -line.quantity,
          reason: 'purchase_return',
          note: `Returned ${purchaseReturn.returnNumber}`,
          unitCost: toNumber(line.unitCost),
          sourceType: 'purchase_return',
          sourceId: purchaseReturn.id,
          actor,
        });
      }

      const returnAmount = purchaseReturn.lines.reduce(
        (sum, line) => sum + line.quantity * toNumber(line.unitCost),
        0,
      );
      await this.advanced.postInventoryJournal(tx, organizationId, {
        eventKey: `purchase-return:${purchaseReturn.id}`,
        sourceType: 'purchase_return',
        sourceId: purchaseReturn.id,
        description: `Purchase return ${purchaseReturn.returnNumber}`,
        reference: purchaseReturn.returnNumber,
        amount: returnAmount,
        kind: 'purchase_return',
      });
    });
  }

  // ─── Mixer / production ───────────────────────────────────────────────────

  async listMixerRecipes(
    organizationId: string,
    opts?: { page?: number; pageSize?: number; search?: string },
  ): Promise<MixerRecipeListResponse> {
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 25));
    const query = opts?.search?.trim();
    const where = {
      organizationId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { outputProduct: { name: { contains: query, mode: 'insensitive' as const } } },
              { outputProduct: { sku: { contains: query, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.mixerRecipe.count({ where }),
      this.prisma.mixerRecipe.findMany({
        where,
        include: { outputProduct: { select: { name: true, sku: true } } },
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => this.toMixerRecipe(row)),
      total,
      page,
      pageSize,
    };
  }

  async createMixerRecipe(
    organizationId: string,
    input: CreateMixerRecipePayload,
  ): Promise<MixerRecipeListItem> {
    const name = input.name.trim();
    if (!name) throw new BadRequestException('Recipe name is required');
    const inputs = await this.resolveRecipeInputs(organizationId, input.inputs);
    await this.requireActiveProduct(organizationId, input.outputProductId);

    const created = await this.prisma.mixerRecipe.create({
      data: {
        organizationId,
        name,
        outputProductId: input.outputProductId,
        outputQty: input.outputQty,
        status: input.status ?? 'draft',
        inputs,
      },
      include: { outputProduct: { select: { name: true, sku: true } } },
    });
    return this.toMixerRecipe(created);
  }

  async updateMixerRecipe(
    organizationId: string,
    recipeId: string,
    input: UpdateMixerRecipePayload,
  ): Promise<MixerRecipeListItem> {
    const existing = await this.prisma.mixerRecipe.findFirst({
      where: { id: recipeId, organizationId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Mixer recipe not found');

    if (input.outputProductId) {
      await this.requireActiveProduct(organizationId, input.outputProductId);
    }
    const inputs =
      input.inputs !== undefined
        ? await this.resolveRecipeInputs(organizationId, input.inputs)
        : undefined;

    const updated = await this.prisma.mixerRecipe.update({
      where: { id: recipeId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.outputProductId !== undefined
          ? { outputProductId: input.outputProductId }
          : {}),
        ...(input.outputQty !== undefined ? { outputQty: input.outputQty } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(inputs !== undefined ? { inputs } : {}),
      },
      include: { outputProduct: { select: { name: true, sku: true } } },
    });
    return this.toMixerRecipe(updated);
  }

  async deleteMixerRecipe(organizationId: string, recipeId: string): Promise<void> {
    const existing = await this.prisma.mixerRecipe.findFirst({
      where: { id: recipeId, organizationId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Mixer recipe not found');
    await this.prisma.mixerRecipe.delete({ where: { id: recipeId } });
  }

  async listProductionRuns(
    organizationId: string,
    opts?: { page?: number; pageSize?: number },
  ): Promise<ProductionBatchListResponse> {
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 25));
    const where = { organizationId };

    const [total, rows] = await Promise.all([
      this.prisma.productionBatch.count({ where }),
      this.prisma.productionBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => {
        const result = row.result as unknown as ProductionBatchResult;
        if (row.voidedAt && !result.voidedAt) {
          return {
            ...result,
            voidedAt: row.voidedAt.toISOString(),
            voidedByName: row.voidedByName ?? undefined,
          };
        }
        return result;
      }),
      total,
      page,
      pageSize,
    };
  }

  async previewProduction(
    organizationId: string,
    payload: RunProductionBatchPayload,
  ): Promise<ProductionPreviewResult> {
    return this.buildProductionPreview(organizationId, payload);
  }

  async runProduction(
    organizationId: string,
    payload: RunProductionBatchPayload,
    actor?: Actor,
  ): Promise<ProductionBatchResult> {
    const preview = await this.buildProductionPreview(organizationId, payload);
    if (!preview.ok || preview.unitsProduced <= 0) {
      throw new BadRequestException(preview.limitedBy || 'Cannot run production');
    }

    const output = await this.prisma.product.findFirst({
      where: { id: payload.outputProductId, organizationId, deletedAt: null },
      select: { id: true, name: true, sku: true },
    });
    if (!output) throw new NotFoundException('Finished product not found');

    if (payload.recipeId) {
      const recipe = await this.prisma.mixerRecipe.findFirst({
        where: { id: payload.recipeId, organizationId },
        select: { id: true, outputProductId: true },
      });
      if (!recipe) throw new BadRequestException('Mixer recipe not found');
      if (recipe.outputProductId !== payload.outputProductId) {
        throw new BadRequestException('Recipe output product does not match this run');
      }
    }

    const warehouseId = await this.resolveProductionWarehouseId(
      organizationId,
      payload.warehouseId,
    );

    const batchCount = await this.prisma.productionBatch.count({ where: { organizationId } });
    const batchNumber = `PRD-${2400 + batchCount + 1}`;

    const result = await this.prisma.$transaction(async (tx) => {
      for (const input of preview.inputs) {
        if (!input.productId || !input.variantId || !input.usedUnits) {
          throw new BadRequestException(
            `${input.name} must be a linked product with convertible stock units`,
          );
        }
        await this.applyVariantDelta(tx, organizationId, {
          productId: input.productId,
          variantId: input.variantId,
          delta: -input.usedUnits,
          reason: 'production_consume',
          note: `Production — ${input.quantity}${input.unit} ${input.name}`,
          sourceType: 'production',
          sourceId: batchNumber,
          actor,
          warehouseId,
        });
      }

      for (const line of preview.outputs) {
        await this.applyVariantDelta(tx, organizationId, {
          productId: output.id,
          variantId: line.variantId,
          delta: line.units,
          reason: 'production_output',
          note: `Production ${line.variantLabel} ×${line.units}`,
          unitCost: line.costPerUnit || preview.costPerUnit,
          lotNumber: `PRD-${batchNumber}-${line.variantId.slice(0, 6)}`,
          sourceType: 'production',
          sourceId: batchNumber,
          actor,
          warehouseId,
        });
        await tx.productVariant.update({
          where: { id: line.variantId },
          data: { costPrice: new Prisma.Decimal(line.costPerUnit || preview.costPerUnit) },
        });
      }

      const batchResult: ProductionBatchResult = {
        id: randomUUID(),
        batchNumber,
        outputProductId: output.id,
        outputProductName: output.name,
        outputSku: output.sku,
        recipeId: payload.recipeId,
        warehouseId,
        unitsProduced: preview.unitsProduced,
        materialCost: preview.materialCost,
        costPerUnit: preview.costPerUnit,
        inputs: preview.inputs,
        outputs: preview.outputs,
        perUnitRawUsage: preview.perUnitRawUsage,
        note: payload.note?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await tx.productionBatch.create({
        data: {
          id: batchResult.id,
          organizationId,
          batchNumber,
          outputProductId: output.id,
          result: batchResult as unknown as Prisma.InputJsonValue,
          actorUserId: actor?.userId ?? null,
          actorName: actor?.name ?? null,
        },
      });

      if (payload.recipeId) {
        await tx.mixerRecipe.updateMany({
          where: { id: payload.recipeId, organizationId },
          data: { lastMixedAt: new Date() },
        });
      } else {
        await tx.mixerRecipe.updateMany({
          where: {
            organizationId,
            outputProductId: output.id,
            status: 'active',
          },
          data: { lastMixedAt: new Date() },
        });
      }

      return batchResult;
    });

    return result;
  }

  async voidProduction(
    organizationId: string,
    batchId: string,
    actor?: Actor,
  ): Promise<ProductionBatchResult> {
    const existing = await this.prisma.productionBatch.findFirst({
      where: { id: batchId, organizationId },
    });
    if (!existing) throw new NotFoundException('Production batch not found');
    if (existing.voidedAt) {
      throw new ConflictException('Production batch is already voided');
    }

    const result = existing.result as unknown as ProductionBatchResult;
    const warehouseId = result.warehouseId;
    if (!warehouseId) {
      throw new BadRequestException(
        'This batch has no warehouse on record and cannot be voided safely',
      );
    }

    const now = new Date();
    const claimed = await this.prisma.productionBatch.updateMany({
      where: { id: batchId, organizationId, voidedAt: null },
      data: {
        voidedAt: now,
        voidedByUserId: actor?.userId ?? null,
        voidedByName: actor?.name ?? null,
      },
    });
    if (claimed.count !== 1) {
      throw new ConflictException('Production batch is already voided');
    }

    try {
      const voided = await this.prisma.$transaction(async (tx) => {
        // Reverse finished goods first (consume output).
        for (const line of result.outputs ?? []) {
          if (!line.variantId || !line.units) continue;
          await this.applyVariantDelta(tx, organizationId, {
            productId: result.outputProductId,
            variantId: line.variantId,
            delta: -line.units,
            reason: 'production_void_output',
            note: `Void ${result.batchNumber} — reverse ${line.variantLabel} ×${line.units}`,
            sourceType: 'production_void',
            sourceId: result.batchNumber,
            actor,
            warehouseId,
          });
        }

        // Restore raw materials.
        for (const input of result.inputs ?? []) {
          if (!input.productId || !input.variantId || !input.usedUnits) continue;
          await this.applyVariantDelta(tx, organizationId, {
            productId: input.productId,
            variantId: input.variantId,
            delta: input.usedUnits,
            reason: 'production_void_restore',
            note: `Void ${result.batchNumber} — restore ${input.name}`,
            sourceType: 'production_void',
            sourceId: result.batchNumber,
            actor,
            warehouseId,
          });
        }

        const nextResult: ProductionBatchResult = {
          ...result,
          voidedAt: now.toISOString(),
          voidedByName: actor?.name || undefined,
        };

        await tx.productionBatch.update({
          where: { id: batchId },
          data: { result: nextResult as unknown as Prisma.InputJsonValue },
        });

        return nextResult;
      });

      return voided;
    } catch (error) {
      // Roll back claim so the batch can be retried after fixing stock.
      await this.prisma.productionBatch.updateMany({
        where: { id: batchId, organizationId, voidedAt: now },
        data: {
          voidedAt: null,
          voidedByUserId: null,
          voidedByName: null,
        },
      });
      throw error;
    }
  }

  private async resolveProductionWarehouseId(
    organizationId: string,
    warehouseId?: string,
  ): Promise<string> {
    if (warehouseId) {
      const wh = await this.prisma.warehouse.findFirst({
        where: { id: warehouseId, organizationId, isActive: true },
        select: { id: true },
      });
      if (!wh) throw new BadRequestException('Invalid or inactive warehouse');
      return wh.id;
    }
    const fallback = await this.prisma.warehouse.findFirst({
      where: { organizationId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    if (!fallback) throw new BadRequestException('No active warehouse — create one in Inventory');
    return fallback.id;
  }

  private async pickRawVariantForProduction(
    organizationId: string,
    productId: string,
    warehouseId: string,
    preferredVariantId?: string,
  ): Promise<{ id: string; stock: number } | null> {
    const variants = await this.prisma.productVariant.findMany({
      where: { productId, organizationId },
      select: { id: true, stock: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!variants.length) return null;

    const levels = await this.prisma.inventoryStockLevel.findMany({
      where: {
        organizationId,
        warehouseId,
        variantId: { in: variants.map((v) => v.id) },
      },
      select: { variantId: true, quantity: true },
    });
    const qtyByVariant = new Map(levels.map((l) => [l.variantId, l.quantity]));

    if (preferredVariantId && variants.some((v) => v.id === preferredVariantId)) {
      return {
        id: preferredVariantId,
        stock: qtyByVariant.get(preferredVariantId) ?? 0,
      };
    }

    const ranked = variants
      .map((v) => ({ id: v.id, stock: qtyByVariant.get(v.id) ?? 0 }))
      .sort((a, b) => b.stock - a.stock || a.id.localeCompare(b.id));
    return ranked[0] ?? null;
  }

  private async buildProductionPreview(
    organizationId: string,
    payload: RunProductionBatchPayload,
  ): Promise<ProductionPreviewResult> {
    const empty: ProductionPreviewResult = {
      unitsProduced: 0,
      materialCost: 0,
      costPerUnit: 0,
      limitedBy: 'Missing product',
      ok: false,
      inputs: [],
      outputs: [],
      perUnitRawUsage: [],
    };

    const output = await this.prisma.product.findFirst({
      where: { id: payload.outputProductId, organizationId, deletedAt: null },
      include: { variants: { select: { id: true, stock: true } } },
    });
    if (!output) return empty;

    let warehouseId: string;
    try {
      warehouseId = await this.resolveProductionWarehouseId(
        organizationId,
        payload.warehouseId,
      );
    } catch (err) {
      return {
        ...empty,
        limitedBy: err instanceof Error ? err.message : 'Warehouse required',
      };
    }

    const raws = (payload.rawMaterials ?? []).filter((r) => r.name.trim() && r.quantity > 0);
    const lines = (payload.outputs ?? []).filter((o) => o.units > 0);
    if (!raws.length) {
      return { ...empty, limitedBy: 'Add at least one raw material' };
    }
    if (!lines.length) {
      return { ...empty, limitedBy: 'Enter units for at least one variant' };
    }
    if (raws.some((r) => !r.productId?.trim())) {
      return { ...empty, limitedBy: 'Every raw material must be a linked product' };
    }

    for (const line of lines) {
      const ownsVariant = output.variants.some((variant) => variant.id === line.variantId);
      if (!ownsVariant) {
        return { ...empty, limitedBy: `Variant ${line.variantLabel} is invalid for this product` };
      }
    }

    const unitsProduced = lines.reduce((sum, line) => sum + line.units, 0);
    const totalFinishedGrams = lines.reduce(
      (sum, line) => sum + line.units * line.gramsPerUnit,
      0,
    );

    const inputs: ProductionBatchResult['inputs'] = [];
    for (const raw of raws) {
      const unitCode = raw.uomId ? undefined : raw.unit;
      const product = await this.prisma.product.findFirst({
        where: { id: raw.productId, organizationId, deletedAt: null },
        select: { id: true, name: true, sku: true },
      });
      if (!product) {
        return { ...empty, limitedBy: `Raw material product not found: ${raw.name}` };
      }

      const picked = await this.pickRawVariantForProduction(
        organizationId,
        product.id,
        warehouseId,
        raw.variantId,
      );
      if (!picked) {
        return { ...empty, limitedBy: `${raw.name.trim()} has no stock variants` };
      }

      let usedUnits: number;
      try {
        const converted = await this.uom.convertToVariantBase(
          organizationId,
          picked.id,
          raw.quantity,
          { uomId: raw.uomId, uomCode: unitCode, allowZero: true },
        );
        usedUnits = converted.baseQuantity;
      } catch (err) {
        return {
          ...empty,
          limitedBy:
            err instanceof Error
              ? `${raw.name.trim()}: ${err.message}`
              : `${raw.name.trim()}: unit conversion failed`,
        };
      }

      if (usedUnits <= 0) {
        return {
          ...empty,
          limitedBy: `${raw.name.trim()}: quantity converts to 0 stock units — increase qty or check UOM`,
        };
      }

      if (picked.stock < usedUnits) {
        return {
          ...empty,
          limitedBy: `${raw.name.trim()} stock in warehouse (need ${usedUnits}, have ${picked.stock})`,
          ok: false,
          inputs: [],
          outputs: [],
          perUnitRawUsage: [],
        };
      }

      const qtyForRate = raw.quantity;
      const costPerKg =
        raw.costPerKg > 0 ? raw.costPerKg : qtyForRate > 0 ? raw.totalCost / qtyForRate : 0;
      const totalCost =
        raw.totalCost > 0 ? raw.totalCost : Math.round(costPerKg * qtyForRate);

      inputs.push({
        productId: product.id,
        variantId: picked.id,
        name: raw.name.trim() || product.name,
        sku: product.sku,
        quantity: raw.quantity,
        unit: unitCode ?? raw.unit,
        uomId: raw.uomId,
        totalCost: Math.round(totalCost),
        costPerKg: Math.round(costPerKg * 100) / 100,
        usedUnits,
      });
    }

    const materialCost = inputs.reduce((sum, input) => sum + input.totalCost, 0);
    const costPerUnit = unitsProduced > 0 ? Math.round(materialCost / unitsProduced) : 0;
    const perUnitRawUsage = inputs.map((input) => ({
      name: input.name,
      unit: input.unit,
      quantityPerUnit:
        unitsProduced > 0 ? Math.round((input.quantity / unitsProduced) * 1000) / 1000 : 0,
      costPerUnit: unitsProduced > 0 ? Math.round(input.totalCost / unitsProduced) : 0,
    }));

    const outputs: ProductionBatchResult['outputs'] = lines.map((line) => {
      const lineGrams = line.units * line.gramsPerUnit;
      const share = totalFinishedGrams > 0 ? lineGrams / totalFinishedGrams : 0;
      const lineCost = Math.round(materialCost * share);
      const rawUsage = inputs.map((input) => {
        const qtyInInputUnit = input.quantity * share;
        const perOneUnit = line.units > 0 ? qtyInInputUnit / line.units : 0;
        return {
          name: input.name,
          unit: input.unit,
          quantityPerUnit: Math.round(perOneUnit * 1000) / 1000,
          costPerUnit:
            line.units > 0 ? Math.round((input.totalCost * share) / line.units) : 0,
        };
      });
      return {
        variantId: line.variantId,
        variantLabel: line.variantLabel,
        gramsPerUnit: line.gramsPerUnit,
        units: line.units,
        cost: lineCost,
        costPerUnit: line.units > 0 ? Math.round(lineCost / line.units) : 0,
        rawUsage,
      };
    });

    return {
      unitsProduced,
      materialCost,
      costPerUnit,
      limitedBy: 'OK',
      ok: true,
      inputs,
      outputs,
      perUnitRawUsage,
    };
  }

  private async requireActiveProduct(organizationId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId, deletedAt: null },
      select: { id: true, name: true, sku: true },
    });
    if (!product) throw new BadRequestException('Invalid or deleted product');
    return product;
  }

  private async resolveRecipeInputs(
    organizationId: string,
    inputs: Array<{
      productId: string;
      productName?: string;
      sku?: string;
      quantity: number;
      unit: string;
      uomId?: string;
    }>,
  ): Promise<MixerRecipeListItem['inputs']> {
    if (!inputs.length) throw new BadRequestException('At least one recipe input is required');
    const productIds = [...new Set(inputs.map((input) => input.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, organizationId, deletedAt: null },
      select: { id: true, name: true, sku: true },
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    return inputs.map((input) => {
      const product = byId.get(input.productId);
      if (!product) {
        throw new BadRequestException('A recipe input references an invalid product');
      }
      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: input.quantity,
        unit: input.unit.trim() || 'pcs',
        uomId: input.uomId,
      };
    });
  }

  private toMixerRecipe(row: {
    id: string;
    name: string;
    outputProductId: string;
    outputQty: number;
    status: string;
    inputs: unknown;
    lastMixedAt: Date | null;
    outputProduct: { name: string; sku: string };
  }): MixerRecipeListItem {
    const inputs = Array.isArray(row.inputs)
      ? (row.inputs as MixerRecipeListItem['inputs'])
      : [];
    return {
      id: row.id,
      name: row.name,
      outputProductId: row.outputProductId,
      outputProductName: row.outputProduct.name,
      outputSku: row.outputProduct.sku,
      outputQty: row.outputQty,
      inputCount: inputs.length,
      inputs,
      lastMixedAt: row.lastMixedAt?.toISOString(),
      status: row.status as 'active' | 'draft',
    };
  }

  private toPurchaseReturnListItem(row: {
    id: string;
    returnNumber: string;
    purchaseNumber: string;
    supplierName: string;
    status: string;
    returnDate: Date;
    reason: string | null;
    lines: { quantity: number; unitCost: Prisma.Decimal | number | unknown }[];
  }): PurchaseReturnListItem {
    return {
      id: row.id,
      returnNumber: row.returnNumber,
      purchaseNumber: row.purchaseNumber,
      supplierName: row.supplierName,
      itemCount: row.lines.reduce((sum, line) => sum + line.quantity, 0),
      totalAmount: row.lines.reduce(
        (sum, line) => sum + line.quantity * toNumber(line.unitCost),
        0,
      ),
      status: row.status as 'pending' | 'approved' | 'completed',
      returnDate: row.returnDate.toISOString().slice(0, 10),
      reason: row.reason ?? undefined,
    };
  }

  private toPurchaseReturnDetail(row: {
    id: string;
    purchaseId: string | null;
    returnNumber: string;
    purchaseNumber: string;
    supplierName: string;
    status: string;
    returnDate: Date;
    reason: string | null;
    completedAt: Date | null;
    createdAt: Date;
    lines: {
      id: string;
      productId: string;
      variantId: string;
      quantity: number;
      unitCost: unknown;
      product: { name: string; sku: string };
      variant: { label: string; sku: string };
    }[];
  }): PurchaseReturnDetail {
    const base = this.toPurchaseReturnListItem(row);
    return {
      ...base,
      purchaseId: row.purchaseId ?? undefined,
      completedAt: row.completedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      lines: row.lines.map((line) => {
        const unitCost = toNumber(line.unitCost);
        return {
          id: line.id,
          productId: line.productId,
          productName: line.product.name,
          productSku: line.product.sku,
          variantId: line.variantId,
          variantLabel: line.variant.label,
          variantSku: line.variant.sku,
          quantity: line.quantity,
          unitCost,
          lineTotal: line.quantity * unitCost,
        };
      }),
    };
  }

  private async applyVariantDelta(
    tx: Prisma.TransactionClient,
    organizationId: string,
    input: {
      productId: string;
      variantId: string;
      delta: number;
      reason: string;
      note?: string;
      unitCost?: number;
      sourceType?: string;
      sourceId?: string;
      actor?: Actor;
      expiresAt?: Date | null;
      lotNumber?: string;
      warehouseId?: string;
    },
  ): Promise<void> {
    const qty = Math.abs(Math.trunc(input.delta));
    if (qty <= 0) return;

    if (input.delta < 0) {
      const writeoffReasons = ['damage', 'expiry', 'theft_loss', 'gift_sample'];
      await this.advanced.consumeStock(tx, organizationId, {
        productId: input.productId,
        variantId: input.variantId,
        quantity: qty,
        warehouseId: input.warehouseId,
        preferFefo: true,
        reason: input.reason,
        note: input.note,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        actor: input.actor,
        // purchase_return journal is posted once by completePurchaseReturn
        journalKind: writeoffReasons.includes(input.reason) ? 'writeoff' : undefined,
        journalEventKey: input.sourceId
          ? `writeoff:${input.sourceId}:${input.variantId}`
          : undefined,
        journalDescription: `Stock write-off (${input.reason})`,
      });
      return;
    }

    await this.advanced.receiveStock(tx, organizationId, {
      productId: input.productId,
      variantId: input.variantId,
      quantity: qty,
      warehouseId: input.warehouseId,
      unitCost: input.unitCost,
      createLot: true,
      lot: {
        lotNumber: input.lotNumber ?? `${input.reason.slice(0, 10)}-${randomUUID().slice(0, 8)}`,
        expiresAt: input.expiresAt ?? null,
      },
      reason: input.reason,
      note: input.note,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      actor: input.actor,
    });
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return date;
  }

  private toSupplierListItem(supplier: {
    id: string;
    name: string;
    contactPerson: string | null;
    phone: string;
    email: string | null;
    address: string | null;
    status: string;
    tags: string[];
    purchases: {
      paymentStatus: string;
      stockStatus: string;
      purchaseDate: Date;
      lines: { quantity: number; unitCost: unknown; productId: string }[];
    }[];
  }): SupplierListItem {
    const openPurchases = supplier.purchases.filter(
      (purchase) =>
        purchase.paymentStatus !== 'paid' && purchase.stockStatus !== 'cancelled',
    );
    const balance = openPurchases.reduce(
      (sum, purchase) =>
        sum +
        purchase.lines.reduce(
          (lineSum, line) => lineSum + line.quantity * toNumber(line.unitCost),
          0,
        ),
      0,
    );
    const productIds = new Set<string>();
    for (const purchase of supplier.purchases) {
      for (const line of purchase.lines) productIds.add(line.productId);
    }
    return {
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? undefined,
      phone: supplier.phone,
      email: supplier.email ?? undefined,
      address: supplier.address ?? undefined,
      balance,
      productCount: productIds.size,
      lastPurchaseAt: supplier.purchases[0]?.purchaseDate.toISOString(),
      status: supplier.status as 'active' | 'inactive',
      tags: supplier.tags,
    };
  }

  private toPurchaseDetail(purchase: {
    id: string;
    purchaseNumber: string;
    supplierId: string;
    supplier: { name: string };
    paymentStatus: string;
    stockStatus: string;
    purchaseDate: Date;
    dueDate: Date | null;
    notes: string | null;
    receivedAt: Date | null;
    receivedByName: string | null;
    lines: {
      id: string;
      productId: string;
      variantId: string;
      quantity: number;
      receivedQuantity?: number;
      unitCost: unknown;
      product: { name: string; sku: string };
      variant: { label: string; sku: string };
    }[];
  }): PurchaseDetail {
    const base = this.toPurchaseListItem(purchase);
    return {
      ...base,
      receivedAt: purchase.receivedAt?.toISOString(),
      receivedByName: purchase.receivedByName ?? undefined,
      lines: purchase.lines.map((line) => {
        const unitCost = toNumber(line.unitCost);
        const receivedQuantity = line.receivedQuantity ?? 0;
        return {
          id: line.id,
          productId: line.productId,
          productName: line.product.name,
          productSku: line.product.sku,
          variantId: line.variantId,
          variantLabel: line.variant.label,
          variantSku: line.variant.sku,
          quantity: line.quantity,
          receivedQuantity,
          remainingQuantity: Math.max(0, line.quantity - receivedQuantity),
          unitCost,
          lineTotal: line.quantity * unitCost,
        };
      }),
    };
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
