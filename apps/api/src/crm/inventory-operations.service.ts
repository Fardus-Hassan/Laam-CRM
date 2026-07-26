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
  RunProductionBatchPayload,
  StockAdjustmentListResponse,
  SupplierListItem,
  SupplierListResponse,
  UpdateMixerRecipePayload,
  UpdateSupplierPayload,
} from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';
import { InventoryAdvancedService } from './inventory-advanced.service';
import {
  type Actor,
  InventoryCatalogService,
  isUniqueConstraintError,
  toNumber,
} from './inventory-catalog.service';
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
            stockStatus: true,
            purchaseDate: true,
            lines: { select: { quantity: true, unitCost: true, productId: true } },
          },
          orderBy: { purchaseDate: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      items: rows.map((supplier) => this.toSupplierListItem(supplier)),
      total: rows.length,
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
          .filter(
            (purchase) =>
              purchase.paymentStatus !== 'paid' && purchase.stockStatus !== 'cancelled',
          )
          .reduce((sum, purchase) => sum + purchase.totalAmount, 0),
        pendingReceipt: items.filter((purchase) => purchase.stockStatus === 'pending').length,
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
    return this.toPurchaseDetail(purchase);
  }

  async updatePurchasePayment(
    organizationId: string,
    purchaseId: string,
    paymentStatus: PurchasePaymentStatus,
  ): Promise<PurchaseListItem> {
    const existing = await this.prisma.inventoryPurchase.findFirst({
      where: { id: purchaseId, organizationId },
      select: { id: true, stockStatus: true },
    });
    if (!existing) throw new NotFoundException('Purchase order not found');
    if (existing.stockStatus === 'cancelled') {
      throw new ConflictException('Cannot update payment on a cancelled purchase');
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

  async receivePurchase(
    organizationId: string,
    purchaseId: string,
    actor?: Actor,
  ): Promise<PurchaseListItem> {
    await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.inventoryPurchase.findFirst({
        where: { id: purchaseId, organizationId },
        include: { lines: true, supplier: { select: { name: true } } },
      });
      if (!purchase) throw new NotFoundException('Purchase order not found');
      if (purchase.stockStatus === 'received') {
        throw new ConflictException(`${purchase.purchaseNumber} is already received`);
      }
      if (purchase.stockStatus === 'cancelled') {
        throw new ConflictException(`${purchase.purchaseNumber} is cancelled`);
      }

      const claimed = await tx.inventoryPurchase.updateMany({
        where: {
          id: purchaseId,
          organizationId,
          stockStatus: { notIn: ['received', 'cancelled'] },
        },
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

      const warehouse = await this.advanced.ensureDefaultWarehouse(organizationId, tx);
      let inventoryAmount = 0;

      for (const line of purchase.lines) {
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
        inventoryAmount += line.quantity * unitCost;
        const lotNumber = `PO-${purchase.purchaseNumber}-${line.id.slice(0, 8)}`.toUpperCase();
        const lot = await tx.inventoryLot.create({
          data: {
            organizationId,
            variantId: line.variantId,
            warehouseId: warehouse.id,
            lotNumber,
            quantity: line.quantity,
            unitCost: line.unitCost,
            receivedAt: new Date(),
            status: 'active',
          },
        });

        await tx.productVariant.update({
          where: { id: variant.id },
          data: { costPrice: line.unitCost },
        });

        await this.advanced.applyWarehouseDelta(tx, organizationId, {
          warehouseId: warehouse.id,
          productId: line.productId,
          variantId: line.variantId,
          delta: line.quantity,
          reason: 'purchase_received',
          note: `Received ${purchase.purchaseNumber}`,
          unitCost,
          lotId: lot.id,
          sourceType: 'purchase',
          sourceId: purchase.id,
          actor,
        });
      }

      await this.advanced.postInventoryJournal(tx, organizationId, {
        eventKey: `purchase-receipt:${purchase.id}`,
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

  async listPurchaseReturns(organizationId: string): Promise<PurchaseReturnListResponse> {
    const rows = await this.prisma.inventoryPurchaseReturn.findMany({
      where: { organizationId },
      include: { lines: { select: { quantity: true, unitCost: true } } },
      orderBy: [{ returnDate: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      items: rows.map((row) => this.toPurchaseReturnListItem(row)),
      total: rows.length,
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

  async listMixerRecipes(organizationId: string): Promise<MixerRecipeListResponse> {
    const rows = await this.prisma.mixerRecipe.findMany({
      where: { organizationId },
      include: { outputProduct: { select: { name: true, sku: true } } },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });

    return {
      items: rows.map((row) => this.toMixerRecipe(row)),
      total: rows.length,
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

  async listProductionRuns(organizationId: string): Promise<ProductionBatchListResponse> {
    const rows = await this.prisma.productionBatch.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      items: rows.map((row) => row.result as unknown as ProductionBatchResult),
      total: rows.length,
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

    const batchCount = await this.prisma.productionBatch.count({ where: { organizationId } });
    const batchNumber = `PRD-${2400 + batchCount + 1}`;

    const result = await this.prisma.$transaction(async (tx) => {
      for (const input of preview.inputs) {
        if (!input.productId || !input.usedUnits) continue;
        const variant = await tx.productVariant.findFirst({
          where: { productId: input.productId, organizationId },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        if (!variant) {
          throw new BadRequestException(`${input.name} has no stock variants`);
        }
        await this.applyVariantDelta(tx, organizationId, {
          productId: input.productId,
          variantId: variant.id,
          delta: -input.usedUnits,
          reason: 'production_consume',
          note: `Production — ${input.quantity}${input.unit} ${input.name}`,
          actor,
        });
      }

      for (const line of preview.outputs) {
        await this.applyVariantDelta(tx, organizationId, {
          productId: output.id,
          variantId: line.variantId,
          delta: line.units,
          reason: 'production_output',
          note: `Production ${line.variantLabel} ×${line.units}`,
          actor,
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
        unitsProduced: preview.unitsProduced,
        materialCost: preview.materialCost,
        costPerUnit: preview.costPerUnit,
        inputs: preview.inputs,
        outputs: preview.outputs,
        perUnitRawUsage: preview.perUnitRawUsage,
        note: payload.note?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      const created = await tx.productionBatch.create({
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

      await tx.mixerRecipe.updateMany({
        where: {
          organizationId,
          outputProductId: output.id,
          status: 'active',
        },
        data: { lastMixedAt: new Date() },
      });

      return created.result as unknown as ProductionBatchResult;
    });

    return result;
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

    const raws = (payload.rawMaterials ?? []).filter((r) => r.name.trim() && r.quantity > 0);
    const lines = (payload.outputs ?? []).filter((o) => o.units > 0);
    if (!raws.length) {
      return { ...empty, limitedBy: 'Add at least one raw material' };
    }
    if (!lines.length) {
      return { ...empty, limitedBy: 'Enter units for at least one variant' };
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
      let sku: string | undefined;
      let usedUnits: number | undefined;
      let availableStock = 0;

      if (raw.productId) {
        const product = await this.prisma.product.findFirst({
          where: { id: raw.productId, organizationId, deletedAt: null },
          include: {
            variants: {
              select: { id: true, stock: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
        if (!product) {
          return { ...empty, limitedBy: `Raw material product not found: ${raw.name}` };
        }
        sku = product.sku;
        const variantId = product.variants[0]?.id;
        availableStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
        if (variantId) {
          const converted = await this.uom.convertToVariantBase(
            organizationId,
            variantId,
            raw.quantity,
            { uomId: raw.uomId, uomCode: unitCode },
          );
          usedUnits = converted.baseQuantity;
        }
      }

      const qtyKg =
        unitCode === 'kg'
          ? raw.quantity
          : unitCode === 'g'
            ? raw.quantity / 1000
            : usedUnits != null
              ? usedUnits / 1000
              : raw.quantity;
      const costPerKg =
        raw.costPerKg > 0 ? raw.costPerKg : qtyKg > 0 ? raw.totalCost / qtyKg : 0;
      const totalCost = raw.totalCost > 0 ? raw.totalCost : Math.round(costPerKg * qtyKg);

      inputs.push({
        productId: raw.productId,
        name: raw.name.trim(),
        sku,
        quantity: raw.quantity,
        unit: unitCode ?? raw.unit,
        uomId: raw.uomId,
        totalCost: Math.round(totalCost),
        costPerKg: Math.round(costPerKg * 100) / 100,
        usedUnits,
      });

      if (usedUnits != null && availableStock < usedUnits) {
        return {
          unitsProduced: 0,
          materialCost: 0,
          costPerUnit: 0,
          limitedBy: `${raw.name.trim()} stock (need ${usedUnits}, have ${availableStock})`,
          ok: false,
          inputs: [],
          outputs: [],
          perUnitRawUsage: [],
        };
      }
    }

    const materialCost = inputs.reduce((sum, input) => sum + input.totalCost, 0);
    const costPerUnit = unitsProduced > 0 ? Math.round(materialCost / unitsProduced) : 0;
    const perUnitRawUsage = inputs.map((input) => ({
      name: input.name,
      unit: input.unit,
      quantityPerUnit: unitsProduced > 0 ? Math.round((input.quantity / unitsProduced) * 1000) / 1000 : 0,
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
    },
  ): Promise<void> {
    const warehouse = await this.advanced.ensureDefaultWarehouse(organizationId, tx);
    let unitCost = input.unitCost;
    if (unitCost == null) {
      const variant = await tx.productVariant.findFirst({
        where: { id: input.variantId, organizationId },
        select: { costPrice: true },
      });
      unitCost = variant?.costPrice == null ? undefined : toNumber(variant.costPrice);
    }

    await this.advanced.applyWarehouseDelta(tx, organizationId, {
      warehouseId: warehouse.id,
      productId: input.productId,
      variantId: input.variantId,
      delta: input.delta,
      reason: input.reason,
      note: input.note,
      unitCost,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      actor: input.actor,
    });

    if (
      input.delta < 0 &&
      ['damage', 'expiry', 'theft_loss', 'gift_sample'].includes(input.reason) &&
      unitCost != null
    ) {
      await this.advanced.postInventoryJournal(tx, organizationId, {
        eventKey: `writeoff:${input.sourceId ?? randomUUID()}`,
        sourceType: 'stock_adjustment',
        sourceId: input.sourceId ?? input.variantId,
        description: `Stock write-off (${input.reason})`,
        amount: Math.abs(input.delta) * unitCost,
        kind: 'writeoff',
      });
    }
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
