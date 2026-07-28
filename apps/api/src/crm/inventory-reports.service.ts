import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  InventoryReportsQuery,
  InventoryReportsResponse,
  ProductionBatchResult,
} from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from './inventory-catalog.service';

@Injectable()
export class InventoryReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(
    organizationId: string,
    query: InventoryReportsQuery = {},
  ): Promise<InventoryReportsResponse> {
    const period = this.parsePeriod(query);

    const purchaseDateWhere =
      period.from || period.to
        ? {
            ...(period.from ? { gte: period.from } : {}),
            ...(period.to ? { lte: period.to } : {}),
          }
        : undefined;
    const returnDateWhere = purchaseDateWhere;
    const createdAtWhere = purchaseDateWhere;

    const [
      variants,
      pendingPurchases,
      pendingReturns,
      recentPurchases,
      recentReturns,
      recentProduction,
      recentMovements,
      expiringLotRows,
    ] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: {
          organizationId,
          product: { deletedAt: null },
        },
        select: {
          id: true,
          label: true,
          sku: true,
          stock: true,
          reorderLevel: true,
          costPrice: true,
          productId: true,
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              brandId: true,
              brand: { select: { id: true, name: true } },
              categoryId: true,
              category: { select: { id: true, label: true } },
            },
          },
        },
      }),
      this.prisma.inventoryPurchase.count({
        where: {
          organizationId,
          stockStatus: { in: ['pending', 'partial'] },
        },
      }),
      this.prisma.inventoryPurchaseReturn.count({
        where: {
          organizationId,
          status: { in: ['pending', 'approved'] },
        },
      }),
      this.prisma.inventoryPurchase.findMany({
        where: {
          organizationId,
          ...(purchaseDateWhere ? { purchaseDate: purchaseDateWhere } : {}),
        },
        include: {
          supplier: { select: { name: true } },
          lines: { select: { quantity: true, unitCost: true } },
        },
        orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
        take: 8,
      }),
      this.prisma.inventoryPurchaseReturn.findMany({
        where: {
          organizationId,
          ...(returnDateWhere ? { returnDate: returnDateWhere } : {}),
        },
        include: { lines: { select: { quantity: true, unitCost: true } } },
        orderBy: [{ returnDate: 'desc' }, { createdAt: 'desc' }],
        take: 8,
      }),
      this.prisma.productionBatch.findMany({
        where: {
          organizationId,
          ...(createdAtWhere ? { createdAt: createdAtWhere } : {}),
        },
        include: { outputProduct: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.inventoryStockMovement.findMany({
        where: {
          organizationId,
          ...(createdAtWhere ? { createdAt: createdAtWhere } : {}),
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          variant: { select: { label: true, sku: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      this.prisma.inventoryLot.findMany({
        where: {
          organizationId,
          status: 'active',
          quantity: { gt: 0 },
          expiresAt: { not: null, lte: (() => {
            const d = new Date();
            d.setUTCDate(d.getUTCDate() + 60);
            return d;
          })() },
        },
        include: {
          variant: {
            select: {
              sku: true,
              product: { select: { name: true } },
            },
          },
          warehouse: { select: { code: true, name: true } },
        },
        orderBy: { expiresAt: 'asc' },
        take: 20,
      }),
    ]);

    let totalStockUnits = 0;
    let inventoryValuationAtCost = 0;
    let uncostedSkuCount = 0;
    const lowStock: InventoryReportsResponse['lowStock'] = [];
    const categoryMap = new Map<
      string,
      { id?: string; label: string; units: number; valueAtCost: number }
    >();
    const brandMap = new Map<
      string,
      { id?: string; label: string; units: number; valueAtCost: number }
    >();

    for (const variant of variants) {
      const stock = variant.stock;
      const unitCost =
        variant.costPrice == null ? undefined : toNumber(variant.costPrice);
      const stockValue = unitCost == null ? 0 : stock * unitCost;
      totalStockUnits += stock;
      if (unitCost == null) uncostedSkuCount += 1;
      else inventoryValuationAtCost += stockValue;

      if (stock <= variant.reorderLevel) {
        lowStock.push({
          productId: variant.product.id,
          productName: variant.product.name,
          variantId: variant.id,
          sku: variant.sku,
          variantLabel: variant.label,
          stock,
          reorderLevel: variant.reorderLevel,
          status: stock <= 0 ? 'out_of_stock' : 'low_stock',
          unitCost,
          stockValueAtCost: stockValue,
        });
      }

      const categoryKey = variant.product.categoryId ?? 'uncategorized';
      const categoryLabel = variant.product.category?.label ?? 'Uncategorized';
      const category = categoryMap.get(categoryKey) ?? {
        id: variant.product.categoryId ?? undefined,
        label: categoryLabel,
        units: 0,
        valueAtCost: 0,
      };
      category.units += stock;
      category.valueAtCost += stockValue;
      categoryMap.set(categoryKey, category);

      const brandKey = variant.product.brandId ?? 'unbranded';
      const brandLabel = variant.product.brand?.name ?? 'Unbranded';
      const brand = brandMap.get(brandKey) ?? {
        id: variant.product.brandId ?? undefined,
        label: brandLabel,
        units: 0,
        valueAtCost: 0,
      };
      brand.units += stock;
      brand.valueAtCost += stockValue;
      brandMap.set(brandKey, brand);
    }

    lowStock.sort((a, b) => a.stock - b.stock || a.productName.localeCompare(b.productName));

    const sortBreakdown = (
      items: Map<string, { id?: string; label: string; units: number; valueAtCost: number }>,
    ) =>
      [...items.values()]
        .sort((a, b) => b.valueAtCost - a.valueAtCost || b.units - a.units)
        .slice(0, 8);

    return {
      generatedAt: new Date().toISOString(),
      period: {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      },
      summary: {
        skuCount: variants.length,
        totalStockUnits,
        inventoryValuationAtCost: Math.round(inventoryValuationAtCost * 100) / 100,
        uncostedSkuCount,
        lowStockCount: lowStock.length,
        pendingPurchases,
        pendingReturns,
      },
      lowStock: lowStock.slice(0, 20),
      recent: {
        purchases: recentPurchases.map((purchase) => ({
          id: purchase.id,
          purchaseNumber: purchase.purchaseNumber,
          supplierName: purchase.supplier.name,
          stockStatus: purchase.stockStatus,
          paymentStatus: purchase.paymentStatus,
          itemCount: purchase.lines.reduce((sum, line) => sum + line.quantity, 0),
          totalAmount: purchase.lines.reduce(
            (sum, line) => sum + line.quantity * toNumber(line.unitCost),
            0,
          ),
          occurredAt: purchase.purchaseDate.toISOString(),
        })),
        returns: recentReturns.map((row) => ({
          id: row.id,
          returnNumber: row.returnNumber,
          supplierName: row.supplierName,
          status: row.status,
          itemCount: row.lines.reduce((sum, line) => sum + line.quantity, 0),
          totalAmount: row.lines.reduce(
            (sum, line) => sum + line.quantity * toNumber(line.unitCost),
            0,
          ),
          occurredAt: row.returnDate.toISOString(),
        })),
        production: recentProduction.map((batch) => {
          const result = batch.result as unknown as ProductionBatchResult | null;
          return {
            id: batch.id,
            batchNumber: batch.batchNumber,
            productId: batch.outputProduct.id,
            productName: batch.outputProduct.name,
            unitsProduced: result?.unitsProduced ?? 0,
            materialCost: result?.materialCost ?? 0,
            occurredAt: batch.createdAt.toISOString(),
          };
        }),
        movements: recentMovements.map((row) => ({
          id: row.id,
          productId: row.product.id,
          productName: row.product.name,
          productSku: row.product.sku,
          variantId: row.variantId,
          variantLabel: row.variant?.label ?? '—',
          variantSku: row.variant?.sku ?? '—',
          delta: row.delta,
          previousStock: row.previousStock,
          newStock: row.newStock,
          reason: row.reason,
          note: row.note ?? undefined,
          actorName: row.actorName ?? undefined,
          occurredAt: row.createdAt.toISOString(),
        })),
      },
      valuationBreakdown: {
        categories: sortBreakdown(categoryMap),
        brands: sortBreakdown(brandMap),
      },
      expiringLots: (() => {
        const now = Date.now();
        return expiringLotRows.map((row) => ({
          id: row.id,
          lotNumber: row.lotNumber,
          productName: row.variant.product.name,
          variantSku: row.variant.sku,
          quantity: row.quantity,
          expiresAt: row.expiresAt?.toISOString(),
          daysToExpiry: row.expiresAt
            ? Math.ceil((row.expiresAt.getTime() - now) / (24 * 60 * 60 * 1000))
            : undefined,
          warehouseName: row.warehouse
            ? `${row.warehouse.code} · ${row.warehouse.name}`
            : undefined,
        }));
      })(),
    };
  }

  private parsePeriod(query: InventoryReportsQuery): {
    from?: Date;
    to?: Date;
  } {
    const dateFrom = query.dateFrom?.trim();
    const dateTo = query.dateTo?.trim();
    if (!dateFrom && !dateTo) return {};

    const from = dateFrom ? this.parseDayStart(dateFrom, 'dateFrom') : undefined;
    const to = dateTo ? this.parseDayEnd(dateTo, 'dateTo') : undefined;
    if (from && to && from > to) {
      throw new BadRequestException('dateFrom must be on or before dateTo');
    }
    return { from, to };
  }

  private parseDayStart(value: string, field: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} must be YYYY-MM-DD`);
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private parseDayEnd(value: string, field: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} must be YYYY-MM-DD`);
    }
    const date = new Date(`${value}T23:59:59.999Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }
}
