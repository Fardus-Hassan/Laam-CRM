import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import type {
  CreateWarehousePayload,
  InventoryLot,
  InventoryLotListResponse,
  InventoryReconciliationResponse,
  PostReconciliationAdjustResponse,
  StockMovementListQuery,
  StockMovementListResponse,
  TransferStockPayload,
  UpdateInventoryLotPayload,
  UpdateWarehousePayload,
  WarehouseListResponse,
} from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';
import { type Actor, isUniqueConstraintError, toNumber } from './inventory-shared';
import { InventoryUomService } from './inventory-uom.service';

const INVENTORY_ACCOUNT = { code: '1200', name: 'Inventory Stock' };
const PAYABLE_ACCOUNT = { code: '2000', name: 'Accounts Payable' };
const WRITEOFF_ACCOUNT = { code: '5300', name: 'Inventory Write-off' };
const RECON_ADJ_ACCOUNT = { code: '5400', name: 'Inventory Reconciliation Adj' };
const COGS_ACCOUNT = { code: '5000', name: 'Cost of Goods Sold' };

@Injectable()
export class InventoryAdvancedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uom: InventoryUomService,
  ) {}

  async ensureDefaultWarehouse(organizationId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const existing = await db.warehouse.findFirst({
      where: { organizationId, isDefault: true },
    });
    if (existing) return existing;
    try {
      return await db.warehouse.create({
        data: {
          organizationId,
          code: 'MAIN',
          name: 'Main warehouse',
          isDefault: true,
          isActive: true,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const again = await db.warehouse.findFirst({
          where: { organizationId, isDefault: true },
        });
        if (again) return again;
      }
      throw error;
    }
  }

  async listWarehouses(organizationId: string): Promise<WarehouseListResponse> {
    await this.ensureDefaultWarehouse(organizationId);
    const rows = await this.prisma.warehouse.findMany({
      where: { organizationId },
      include: {
        stockLevels: { select: { quantity: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        address: row.address ?? undefined,
        isDefault: row.isDefault,
        isActive: row.isActive,
        skuCount: row.stockLevels.filter((s) => s.quantity > 0).length,
        totalUnits: row.stockLevels.reduce((sum, s) => sum + s.quantity, 0),
      })),
      total: rows.length,
    };
  }

  async createWarehouse(
    organizationId: string,
    input: CreateWarehousePayload,
  ): Promise<WarehouseListResponse['items'][number]> {
    const code = input.code.trim().toUpperCase();
    try {
      if (input.isDefault) {
        await this.prisma.warehouse.updateMany({
          where: { organizationId, isDefault: true },
          data: { isDefault: false },
        });
      }
      const created = await this.prisma.warehouse.create({
        data: {
          organizationId,
          code,
          name: input.name.trim(),
          address: input.address?.trim() || null,
          isDefault: Boolean(input.isDefault),
          isActive: true,
        },
      });
      return {
        id: created.id,
        code: created.code,
        name: created.name,
        address: created.address ?? undefined,
        isDefault: created.isDefault,
        isActive: created.isActive,
        skuCount: 0,
        totalUnits: 0,
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A warehouse with this code already exists');
      }
      throw error;
    }
  }

  async updateWarehouse(
    organizationId: string,
    id: string,
    input: UpdateWarehousePayload,
  ): Promise<WarehouseListResponse['items'][number]> {
    const existing = await this.prisma.warehouse.findFirst({
      where: { id, organizationId },
      include: { stockLevels: { select: { quantity: true } } },
    });
    if (!existing) throw new NotFoundException('Warehouse not found');

    if (input.isDefault) {
      await this.prisma.warehouse.updateMany({
        where: { organizationId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    try {
      const updated = await this.prisma.warehouse.update({
        where: { id },
        data: {
          ...(input.code != null ? { code: input.code.trim().toUpperCase() } : {}),
          ...(input.name != null ? { name: input.name.trim() } : {}),
          ...(input.address !== undefined
            ? { address: input.address?.trim() || null }
            : {}),
          ...(input.isDefault != null ? { isDefault: input.isDefault } : {}),
          ...(input.isActive != null ? { isActive: input.isActive } : {}),
        },
        include: { stockLevels: { select: { quantity: true } } },
      });
      return {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        address: updated.address ?? undefined,
        isDefault: updated.isDefault,
        isActive: updated.isActive,
        skuCount: updated.stockLevels.filter((s) => s.quantity > 0).length,
        totalUnits: updated.stockLevels.reduce((sum, s) => sum + s.quantity, 0),
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A warehouse with this code already exists');
      }
      throw error;
    }
  }

  async transferStock(
    organizationId: string,
    input: TransferStockPayload,
    actor?: Actor,
  ): Promise<void> {
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must differ');
    }
    const transferGroupId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      const [from, to, variant] = await Promise.all([
        tx.warehouse.findFirst({
          where: { id: input.fromWarehouseId, organizationId, isActive: true },
        }),
        tx.warehouse.findFirst({
          where: { id: input.toWarehouseId, organizationId, isActive: true },
        }),
        tx.productVariant.findFirst({
          where: {
            id: input.variantId,
            productId: input.productId,
            organizationId,
            product: { deletedAt: null },
          },
          select: { id: true, stock: true, costPrice: true },
        }),
      ]);
      if (!from) throw new NotFoundException('Source warehouse not found');
      if (!to) throw new NotFoundException('Destination warehouse not found');
      if (!variant) throw new NotFoundException('Variant not found');

      const { baseQuantity } = await this.uom.convertToVariantBase(
        organizationId,
        input.variantId,
        input.quantity,
        { uomId: input.uomId, uomCode: input.uomCode },
        tx,
      );

      const unitCost = variant.costPrice == null ? undefined : toNumber(variant.costPrice);
      const consumed = await this.consumeStock(tx, organizationId, {
        productId: input.productId,
        variantId: input.variantId,
        quantity: baseQuantity,
        warehouseId: from.id,
        preferFefo: true,
        reason: 'warehouse_transfer_out',
        note: input.note?.trim() || `Transfer to ${to.code}`,
        sourceType: 'warehouse_transfer',
        sourceId: transferGroupId,
        transferGroupId,
        actor,
        skipAggregate: false,
      });

      for (const slice of consumed.slices) {
        let expiresAt: Date | null = null;
        let barcode: string | null = null;
        if (slice.lotId) {
          const srcLot = await tx.inventoryLot.findFirst({
            where: { id: slice.lotId },
            select: { expiresAt: true, barcode: true, lotNumber: true },
          });
          expiresAt = srcLot?.expiresAt ?? null;
          barcode = srcLot?.barcode ?? null;
        }
        await this.receiveStock(tx, organizationId, {
          productId: input.productId,
          variantId: input.variantId,
          quantity: slice.quantity,
          warehouseId: to.id,
          unitCost: slice.unitCost ?? unitCost,
          createLot: true,
          lot: {
            lotNumber: `XFER-${transferGroupId.slice(0, 8)}-${randomUUID().slice(0, 6)}`,
            expiresAt,
            barcode,
          },
          reason: 'warehouse_transfer_in',
          note: input.note?.trim() || `Transfer from ${from.code}`,
          sourceType: 'warehouse_transfer',
          sourceId: transferGroupId,
          transferGroupId,
          actor,
          skipAggregate: true,
        });
      }
    });
  }

  async listOrgStockMovements(
    organizationId: string,
    query: StockMovementListQuery = {},
  ): Promise<StockMovementListResponse> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(Math.max(1, query.pageSize ?? 50), 1000);
    const where: Prisma.InventoryStockMovementWhereInput = { organizationId };

    if (query.productId) where.productId = query.productId;
    if (query.variantId) where.variantId = query.variantId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.reason) where.reason = query.reason;
    if (query.direction === 'in') where.delta = { gt: 0 };
    if (query.direction === 'out') where.delta = { lt: 0 };
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
      };
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { note: { contains: q, mode: 'insensitive' } },
        { reason: { contains: q, mode: 'insensitive' } },
        { product: { name: { contains: q, mode: 'insensitive' } } },
        { product: { sku: { contains: q, mode: 'insensitive' } } },
        { variant: { sku: { contains: q, mode: 'insensitive' } } },
        { variant: { barcode: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.inventoryStockMovement.count({ where }),
      this.prisma.inventoryStockMovement.findMany({
        where,
        include: {
          product: { select: { name: true, sku: true } },
          variant: { select: { label: true, sku: true } },
          warehouse: { select: { name: true, code: true } },
          lot: { select: { lotNumber: true } },
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
        productSku: row.product.sku,
        variantId: row.variantId,
        variantLabel: row.variant?.label,
        variantSku: row.variant?.sku,
        warehouseId: row.warehouseId ?? undefined,
        warehouseName: row.warehouse
          ? `${row.warehouse.code} · ${row.warehouse.name}`
          : undefined,
        lotId: row.lotId ?? undefined,
        lotNumber: row.lot?.lotNumber,
        delta: row.delta,
        previousStock: row.previousStock,
        newStock: row.newStock,
        unitCost: row.unitCost == null ? undefined : toNumber(row.unitCost),
        valueDelta: row.valueDelta == null ? undefined : toNumber(row.valueDelta),
        reason: row.reason,
        note: row.note ?? undefined,
        sourceType: row.sourceType ?? undefined,
        sourceId: row.sourceId ?? undefined,
        actorName: row.actorName ?? undefined,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  async listLots(
    organizationId: string,
    opts?: {
      expiringWithinDays?: number;
      status?: string;
      search?: string;
      page?: number;
      pageSize?: number;
      /** When true, sort FEFO (earliest expiry first), then receivedAt. */
      fefo?: boolean;
    },
  ): Promise<InventoryLotListResponse> {
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, opts?.pageSize ?? 50));
    const query = opts?.search?.trim();
    const where: Prisma.InventoryLotWhereInput = {
      organizationId,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(query
        ? {
            OR: [
              { lotNumber: { contains: query, mode: 'insensitive' as const } },
              { barcode: { contains: query, mode: 'insensitive' as const } },
              { variant: { sku: { contains: query, mode: 'insensitive' as const } } },
              { variant: { product: { name: { contains: query, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    };
    if (opts?.expiringWithinDays != null) {
      const until = new Date();
      until.setUTCDate(until.getUTCDate() + opts.expiringWithinDays);
      where.expiresAt = { lte: until, not: null };
      where.status = opts?.status ?? 'active';
      where.quantity = { gt: 0 };
    }

    const orderBy: Prisma.InventoryLotOrderByWithRelationInput[] = opts?.fefo
      ? [{ expiresAt: 'asc' }, { receivedAt: 'asc' }]
      : [{ expiresAt: 'asc' }, { receivedAt: 'desc' }];

    const [total, rows] = await Promise.all([
      this.prisma.inventoryLot.count({ where }),
      this.prisma.inventoryLot.findMany({
        where,
        include: {
          variant: {
            select: {
              label: true,
              sku: true,
              productId: true,
              product: { select: { name: true } },
            },
          },
          warehouse: { select: { name: true, code: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const now = Date.now();
    return {
      items: rows.map((row) => this.toLotDto(row, now)),
      total,
      page,
      pageSize,
    };
  }

  async updateLot(
    organizationId: string,
    lotId: string,
    input: UpdateInventoryLotPayload,
  ): Promise<InventoryLot> {
    const existing = await this.prisma.inventoryLot.findFirst({
      where: { id: lotId, organizationId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Lot not found');

    let expiresAt: Date | null | undefined;
    if (input.expiresAt !== undefined) {
      if (input.expiresAt === null || input.expiresAt === '') {
        expiresAt = null;
      } else {
        const parsed = new Date(input.expiresAt);
        if (Number.isNaN(parsed.getTime())) {
          throw new BadRequestException('expiresAt must be a valid date');
        }
        expiresAt = parsed;
      }
    }

    const updated = await this.prisma.inventoryLot.update({
      where: { id: lotId },
      data: {
        ...(expiresAt !== undefined ? { expiresAt } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.barcode !== undefined
          ? { barcode: input.barcode?.trim() ? input.barcode.trim() : null }
          : {}),
      },
      include: {
        variant: {
          select: {
            label: true,
            sku: true,
            productId: true,
            product: { select: { name: true } },
          },
        },
        warehouse: { select: { name: true, code: true } },
      },
    });
    return this.toLotDto(updated, Date.now());
  }

  private toLotDto(
    row: {
      id: string;
      variantId: string;
      warehouseId: string | null;
      lotNumber: string;
      barcode: string | null;
      manufacturedAt: Date | null;
      expiresAt: Date | null;
      receivedAt: Date;
      quantity: number;
      unitCost: unknown;
      status: string;
      variant: {
        label: string;
        sku: string;
        productId: string;
        product: { name: string };
      };
      warehouse: { name: string; code: string } | null;
    },
    now: number,
  ): InventoryLot {
    const expiresAt = row.expiresAt?.toISOString();
    const daysToExpiry =
      row.expiresAt == null
        ? undefined
        : Math.ceil((row.expiresAt.getTime() - now) / (24 * 60 * 60 * 1000));
    return {
      id: row.id,
      variantId: row.variantId,
      productId: row.variant.productId,
      productName: row.variant.product.name,
      variantLabel: row.variant.label,
      variantSku: row.variant.sku,
      warehouseId: row.warehouseId ?? undefined,
      warehouseName: row.warehouse
        ? `${row.warehouse.code} · ${row.warehouse.name}`
        : undefined,
      lotNumber: row.lotNumber,
      barcode: row.barcode ?? undefined,
      manufacturedAt: row.manufacturedAt?.toISOString(),
      expiresAt,
      receivedAt: row.receivedAt.toISOString(),
      quantity: row.quantity,
      unitCost: row.unitCost == null ? undefined : toNumber(row.unitCost),
      status: row.status,
      daysToExpiry,
    };
  }

  async getReconciliation(organizationId: string): Promise<InventoryReconciliationResponse> {
    const variants = await this.prisma.productVariant.findMany({
      where: { organizationId, product: { deletedAt: null } },
      select: { stock: true, costPrice: true },
    });
    const inventoryValuationAtCost = variants.reduce((sum, v) => {
      const cost = v.costPrice == null ? 0 : toNumber(v.costPrice);
      return sum + v.stock * cost;
    }, 0);

    const lines = await this.prisma.accountingJournalLine.findMany({
      where: {
        journalEntry: { organizationId, status: 'posted' },
        accountCode: { in: [INVENTORY_ACCOUNT.code, '1210', '1220'] },
      },
      select: { accountCode: true, accountName: true, debit: true, credit: true },
    });

    const accountMap = new Map<
      string,
      { accountCode: string; accountName: string; debit: number; credit: number }
    >();
    for (const line of lines) {
      const current = accountMap.get(line.accountCode) ?? {
        accountCode: line.accountCode,
        accountName: line.accountName,
        debit: 0,
        credit: 0,
      };
      current.debit += toNumber(line.debit);
      current.credit += toNumber(line.credit);
      accountMap.set(line.accountCode, current);
    }
    const accounts = [...accountMap.values()].map((a) => ({
      ...a,
      balance: Math.round((a.debit - a.credit) * 100) / 100,
    }));
    const inventoryGlBalance =
      Math.round(accounts.reduce((sum, a) => sum + a.balance, 0) * 100) / 100;
    const valuation = Math.round(inventoryValuationAtCost * 100) / 100;
    const difference = Math.round((valuation - inventoryGlBalance) * 100) / 100;

    const journals = await this.prisma.accountingJournalEntry.findMany({
      where: { organizationId },
      include: { lines: true },
      orderBy: { postedAt: 'desc' },
      take: 12,
    });

    const expiring = await this.listLots(organizationId, { expiringWithinDays: 60 });

    return {
      generatedAt: new Date().toISOString(),
      inventoryValuationAtCost: valuation,
      inventoryGlBalance,
      difference,
      isBalanced: Math.abs(difference) < 0.01,
      accounts,
      recentJournals: journals.map((j) => {
        const amount = j.lines.reduce((sum, l) => sum + toNumber(l.debit), 0);
        return {
          id: j.id,
          entryDate: j.entryDate.toISOString(),
          description: j.description,
          reference: j.reference ?? undefined,
          sourceType: j.sourceType,
          sourceId: j.sourceId,
          amount,
        };
      }),
      expiringLots: expiring.items.slice(0, 10),
    };
  }

  async postReconciliationAdjust(
    organizationId: string,
    actor?: Actor,
  ): Promise<PostReconciliationAdjustResponse> {
    const snapshot = await this.getReconciliation(organizationId);
    if (snapshot.isBalanced || Math.abs(snapshot.difference) < 0.01) {
      throw new BadRequestException('Inventory is already balanced — nothing to post');
    }

    const difference = snapshot.difference;
    const amount = Math.abs(difference);
    const eventKey = `inventory-recon:${organizationId}:${Date.now()}`;
    const kind = difference > 0 ? 'reconciliation_gain' : 'reconciliation_loss';

    const journalId = await this.prisma.$transaction(async (tx) => {
      await this.postInventoryJournal(tx, organizationId, {
        eventKey,
        sourceType: 'reconciliation',
        sourceId: organizationId,
        description: `Inventory reconciliation adjust (${difference > 0 ? 'increase' : 'decrease'} GL by ${amount.toFixed(2)})`,
        reference: actor?.name ? `by ${actor.name}` : undefined,
        amount,
        kind,
      });
      const created = await tx.accountingJournalEntry.findFirst({
        where: { organizationId, eventKey },
        select: { id: true },
      });
      if (!created) throw new ConflictException('Failed to post reconciliation journal');
      return created.id;
    });

    return {
      ok: true,
      differencePosted: difference,
      journalId,
      eventKey,
    };
  }

  async postInventoryJournal(
    tx: Prisma.TransactionClient,
    organizationId: string,
    input: {
      eventKey: string;
      sourceType: string;
      sourceId: string;
      description: string;
      reference?: string;
      amount: number;
      /** purchase_receive | purchase_return | writeoff | sale_cogs | sale_cogs_reversal | reconciliation_* */
      kind:
        | 'purchase_receive'
        | 'purchase_return'
        | 'writeoff'
        | 'sale_cogs'
        | 'sale_cogs_reversal'
        | 'reconciliation_gain'
        | 'reconciliation_loss';
    },
  ): Promise<void> {
    if (input.amount <= 0) return;
    const existing = await tx.accountingJournalEntry.findFirst({
      where: { organizationId, eventKey: input.eventKey },
      select: { id: true },
    });
    if (existing) return;

    const amount = new Prisma.Decimal(Math.round(input.amount * 100) / 100);
    const lines =
      input.kind === 'purchase_receive'
        ? [
            {
              accountCode: INVENTORY_ACCOUNT.code,
              accountName: INVENTORY_ACCOUNT.name,
              debit: amount,
              credit: new Prisma.Decimal(0),
            },
            {
              accountCode: PAYABLE_ACCOUNT.code,
              accountName: PAYABLE_ACCOUNT.name,
              debit: new Prisma.Decimal(0),
              credit: amount,
            },
          ]
        : input.kind === 'purchase_return'
          ? [
              {
                accountCode: PAYABLE_ACCOUNT.code,
                accountName: PAYABLE_ACCOUNT.name,
                debit: amount,
                credit: new Prisma.Decimal(0),
              },
              {
                accountCode: INVENTORY_ACCOUNT.code,
                accountName: INVENTORY_ACCOUNT.name,
                debit: new Prisma.Decimal(0),
                credit: amount,
              },
            ]
          : input.kind === 'sale_cogs'
            ? [
                {
                  accountCode: COGS_ACCOUNT.code,
                  accountName: COGS_ACCOUNT.name,
                  debit: amount,
                  credit: new Prisma.Decimal(0),
                },
                {
                  accountCode: INVENTORY_ACCOUNT.code,
                  accountName: INVENTORY_ACCOUNT.name,
                  debit: new Prisma.Decimal(0),
                  credit: amount,
                },
              ]
            : input.kind === 'sale_cogs_reversal'
              ? [
                  {
                    accountCode: INVENTORY_ACCOUNT.code,
                    accountName: INVENTORY_ACCOUNT.name,
                    debit: amount,
                    credit: new Prisma.Decimal(0),
                  },
                  {
                    accountCode: COGS_ACCOUNT.code,
                    accountName: COGS_ACCOUNT.name,
                    debit: new Prisma.Decimal(0),
                    credit: amount,
                  },
                ]
          : input.kind === 'reconciliation_gain'
            ? [
                {
                  accountCode: INVENTORY_ACCOUNT.code,
                  accountName: INVENTORY_ACCOUNT.name,
                  debit: amount,
                  credit: new Prisma.Decimal(0),
                },
                {
                  accountCode: RECON_ADJ_ACCOUNT.code,
                  accountName: RECON_ADJ_ACCOUNT.name,
                  debit: new Prisma.Decimal(0),
                  credit: amount,
                },
              ]
            : input.kind === 'reconciliation_loss'
              ? [
                  {
                    accountCode: RECON_ADJ_ACCOUNT.code,
                    accountName: RECON_ADJ_ACCOUNT.name,
                    debit: amount,
                    credit: new Prisma.Decimal(0),
                  },
                  {
                    accountCode: INVENTORY_ACCOUNT.code,
                    accountName: INVENTORY_ACCOUNT.name,
                    debit: new Prisma.Decimal(0),
                    credit: amount,
                  },
                ]
              : [
                  {
                    accountCode: WRITEOFF_ACCOUNT.code,
                    accountName: WRITEOFF_ACCOUNT.name,
                    debit: amount,
                    credit: new Prisma.Decimal(0),
                  },
                  {
                    accountCode: INVENTORY_ACCOUNT.code,
                    accountName: INVENTORY_ACCOUNT.name,
                    debit: new Prisma.Decimal(0),
                    credit: amount,
                  },
                ];

    await tx.accountingJournalEntry.create({
      data: {
        organizationId,
        description: input.description,
        reference: input.reference ?? null,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        eventKey: input.eventKey,
        lines: { create: lines },
      },
    });
  }

  /**
   * Industry-standard outbound: FEFO lot consume → warehouse level → variant aggregate.
   * Falls back to unlotted warehouse qty when lots are insufficient.
   */
  async consumeStock(
    tx: Prisma.TransactionClient,
    organizationId: string,
    input: {
      productId: string;
      variantId: string;
      quantity: number;
      warehouseId?: string;
      preferFefo?: boolean;
      reason: string;
      note?: string;
      sourceType?: string;
      sourceId?: string;
      transferGroupId?: string;
      actor?: Actor;
      skipAggregate?: boolean;
      /** When set, posts a GL entry for the consumed cost. */
      journalKind?:
        | 'writeoff'
        | 'sale_cogs'
        | 'purchase_return'
        | 'reconciliation_loss';
      journalEventKey?: string;
      journalDescription?: string;
    },
  ): Promise<{ totalCost: number; slices: Array<{ lotId?: string; quantity: number; unitCost?: number }> }> {
    const qty = Math.trunc(input.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new BadRequestException('Consume quantity must be a positive integer');
    }

    const warehouse = input.warehouseId
      ? await tx.warehouse.findFirst({
          where: { id: input.warehouseId, organizationId, isActive: true },
        })
      : await this.ensureDefaultWarehouse(organizationId, tx);
    if (!warehouse) throw new BadRequestException('Invalid or inactive warehouse');

    const preferFefo = input.preferFefo !== false;
    const lots = await tx.inventoryLot.findMany({
      where: {
        organizationId,
        variantId: input.variantId,
        warehouseId: warehouse.id,
        status: 'active',
        quantity: { gt: 0 },
      },
      orderBy: preferFefo
        ? [{ expiresAt: 'asc' }, { receivedAt: 'asc' }]
        : [{ receivedAt: 'asc' }],
    });

    let remaining = qty;
    const slices: Array<{ lotId?: string; quantity: number; unitCost?: number }> = [];
    let totalCost = 0;

    for (const lot of lots) {
      if (remaining <= 0) break;
      const take = Math.min(lot.quantity, remaining);
      if (take <= 0) continue;
      const unitCost = lot.unitCost == null ? undefined : toNumber(lot.unitCost);
      const nextQty = lot.quantity - take;
      await tx.inventoryLot.update({
        where: { id: lot.id },
        data: {
          quantity: nextQty,
          ...(nextQty <= 0 ? { status: 'depleted' } : {}),
        },
      });
      await this.applyWarehouseDelta(tx, organizationId, {
        warehouseId: warehouse.id,
        productId: input.productId,
        variantId: input.variantId,
        delta: -take,
        reason: input.reason,
        note: input.note,
        unitCost,
        lotId: lot.id,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        transferGroupId: input.transferGroupId,
        actor: input.actor,
        skipAggregate: input.skipAggregate,
      });
      slices.push({ lotId: lot.id, quantity: take, unitCost });
      if (unitCost != null) totalCost += take * unitCost;
      remaining -= take;
    }

    if (remaining > 0) {
      // Unlotted / legacy warehouse stock
      const variant = await tx.productVariant.findFirst({
        where: { id: input.variantId, organizationId },
        select: { costPrice: true },
      });
      const unitCost =
        variant?.costPrice == null ? undefined : toNumber(variant.costPrice);
      await this.applyWarehouseDelta(tx, organizationId, {
        warehouseId: warehouse.id,
        productId: input.productId,
        variantId: input.variantId,
        delta: -remaining,
        reason: input.reason,
        note: input.note,
        unitCost,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        transferGroupId: input.transferGroupId,
        actor: input.actor,
        skipAggregate: input.skipAggregate,
      });
      slices.push({ quantity: remaining, unitCost });
      if (unitCost != null) totalCost += remaining * unitCost;
      remaining = 0;
    }

    if (input.journalKind && totalCost > 0) {
      await this.postInventoryJournal(tx, organizationId, {
        eventKey:
          input.journalEventKey ??
          `${input.journalKind}:${input.sourceId ?? randomUUID()}:${input.variantId}`,
        sourceType: input.sourceType ?? input.reason,
        sourceId: input.sourceId ?? input.variantId,
        description:
          input.journalDescription ??
          `Inventory ${input.journalKind} (${input.reason})`,
        amount: totalCost,
        kind: input.journalKind,
      });
    }

    return { totalCost, slices };
  }

  /**
   * Industry-standard inbound: optional lot create → warehouse level → variant aggregate.
   */
  async receiveStock(
    tx: Prisma.TransactionClient,
    organizationId: string,
    input: {
      productId: string;
      variantId: string;
      quantity: number;
      warehouseId?: string;
      unitCost?: number;
      lot?: {
        lotNumber?: string;
        expiresAt?: Date | null;
        manufacturedAt?: Date | null;
        barcode?: string | null;
      };
      /** When true (default if lot provided), create an InventoryLot row. */
      createLot?: boolean;
      reason: string;
      note?: string;
      sourceType?: string;
      sourceId?: string;
      transferGroupId?: string;
      actor?: Actor;
      skipAggregate?: boolean;
      journalKind?: 'purchase_receive' | 'reconciliation_gain' | 'sale_cogs_reversal';
      journalEventKey?: string;
      journalDescription?: string;
      journalAmount?: number;
    },
  ): Promise<{ lotId?: string }> {
    const qty = Math.trunc(input.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new BadRequestException('Receive quantity must be a positive integer');
    }

    const warehouse = input.warehouseId
      ? await tx.warehouse.findFirst({
          where: { id: input.warehouseId, organizationId, isActive: true },
        })
      : await this.ensureDefaultWarehouse(organizationId, tx);
    if (!warehouse) throw new BadRequestException('Invalid or inactive warehouse');

    let unitCost = input.unitCost;
    if (unitCost == null) {
      const variant = await tx.productVariant.findFirst({
        where: { id: input.variantId, organizationId },
        select: { costPrice: true },
      });
      unitCost = variant?.costPrice == null ? undefined : toNumber(variant.costPrice);
    }

    const shouldCreateLot = input.createLot ?? Boolean(input.lot);
    let lotId: string | undefined;
    if (shouldCreateLot) {
      const lotNumber = (
        input.lot?.lotNumber?.trim() ||
        `${input.reason.slice(0, 8)}-${randomUUID().slice(0, 8)}`
      ).toUpperCase();
      const lot = await tx.inventoryLot.create({
        data: {
          organizationId,
          variantId: input.variantId,
          warehouseId: warehouse.id,
          lotNumber,
          quantity: qty,
          unitCost: unitCost == null ? null : new Prisma.Decimal(unitCost),
          receivedAt: new Date(),
          expiresAt: input.lot?.expiresAt ?? null,
          manufacturedAt: input.lot?.manufacturedAt ?? null,
          barcode: input.lot?.barcode ?? null,
          status: 'active',
        },
      });
      lotId = lot.id;
    }

    await this.applyWarehouseDelta(tx, organizationId, {
      warehouseId: warehouse.id,
      productId: input.productId,
      variantId: input.variantId,
      delta: qty,
      reason: input.reason,
      note: input.note,
      unitCost,
      lotId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      transferGroupId: input.transferGroupId,
      actor: input.actor,
      skipAggregate: input.skipAggregate,
    });

    const journalAmount = input.journalAmount ?? (unitCost != null ? qty * unitCost : 0);
    if (input.journalKind && journalAmount > 0) {
      await this.postInventoryJournal(tx, organizationId, {
        eventKey:
          input.journalEventKey ??
          `${input.journalKind}:${input.sourceId ?? randomUUID()}:${input.variantId}`,
        sourceType: input.sourceType ?? input.reason,
        sourceId: input.sourceId ?? input.variantId,
        description: input.journalDescription ?? `Stock received (${input.reason})`,
        amount: journalAmount,
        kind: input.journalKind,
      });
    }

    return { lotId };
  }

  /**
   * Update warehouse stock level + optional aggregate variant.stock + movement row.
   * When skipAggregate=true (transfer in), only warehouse level + movement are written.
   */
  async applyWarehouseDelta(
    tx: Prisma.TransactionClient,
    organizationId: string,
    input: {
      warehouseId: string;
      productId: string;
      variantId: string;
      delta: number;
      reason: string;
      note?: string;
      unitCost?: number;
      lotId?: string;
      sourceType?: string;
      sourceId?: string;
      transferGroupId?: string;
      actor?: Actor;
      skipAggregate?: boolean;
    },
  ): Promise<void> {
    if (!Number.isInteger(input.delta) || input.delta === 0) {
      throw new BadRequestException('Delta must be a non-zero integer');
    }

    const level = await tx.inventoryStockLevel.findUnique({
      where: {
        warehouseId_variantId: {
          warehouseId: input.warehouseId,
          variantId: input.variantId,
        },
      },
    });
    const previousWh = level?.quantity ?? 0;
    if (input.delta < 0 && previousWh < -input.delta) {
      throw new BadRequestException('Insufficient stock in source warehouse');
    }

    await tx.inventoryStockLevel.upsert({
      where: {
        warehouseId_variantId: {
          warehouseId: input.warehouseId,
          variantId: input.variantId,
        },
      },
      create: {
        organizationId,
        warehouseId: input.warehouseId,
        variantId: input.variantId,
        quantity: Math.max(0, input.delta),
      },
      update: { quantity: { increment: input.delta } },
    });

    let previousStock = previousWh;
    let newStock = previousWh + input.delta;

    if (!input.skipAggregate) {
      const result = await tx.productVariant.updateMany({
        where: {
          id: input.variantId,
          productId: input.productId,
          organizationId,
          ...(input.delta < 0 ? { stock: { gte: -input.delta } } : {}),
        },
        data: { stock: { increment: input.delta } },
      });
      if (result.count !== 1) {
        throw new BadRequestException('Insufficient stock for this operation');
      }
      const updated = await tx.productVariant.findUniqueOrThrow({
        where: { id: input.variantId },
        select: { stock: true },
      });
      previousStock = updated.stock - input.delta;
      newStock = updated.stock;
    }

    const unitCost =
      input.unitCost == null ? null : new Prisma.Decimal(input.unitCost);
    const valueDelta =
      unitCost == null
        ? null
        : new Prisma.Decimal(input.delta).mul(unitCost);

    await tx.inventoryStockMovement.create({
      data: {
        organizationId,
        productId: input.productId,
        variantId: input.variantId,
        warehouseId: input.warehouseId,
        lotId: input.lotId ?? null,
        delta: input.delta,
        previousStock,
        newStock,
        unitCost,
        valueDelta,
        reason: input.reason,
        note: input.note ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        transferGroupId: input.transferGroupId ?? null,
        actorUserId: input.actor?.userId ?? null,
        actorName: input.actor?.name ?? null,
      },
    });
  }
}
