import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UnitOfMeasure, UnitOfMeasureListResponse } from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from './inventory-catalog.service';

const DEFAULT_UNITS: Array<{
  code: string;
  name: string;
  dimension: string;
  factor: number;
}> = [
  { code: 'pcs', name: 'Pieces', dimension: 'count', factor: 1 },
  { code: 'box', name: 'Box', dimension: 'count', factor: 1 },
  { code: 'dozen', name: 'Dozen', dimension: 'count', factor: 12 },
  { code: 'g', name: 'Gram', dimension: 'mass', factor: 1 },
  { code: 'kg', name: 'Kilogram', dimension: 'mass', factor: 1000 },
  { code: 'mg', name: 'Milligram', dimension: 'mass', factor: 0.001 },
  { code: 'ml', name: 'Millilitre', dimension: 'volume', factor: 1 },
  { code: 'L', name: 'Litre', dimension: 'volume', factor: 1000 },
  { code: 'm', name: 'Metre', dimension: 'length', factor: 1 },
  { code: 'cm', name: 'Centimetre', dimension: 'length', factor: 0.01 },
];

type UomRow = {
  id: string;
  code: string;
  name: string;
  dimension: string;
  factorToDimensionBase: unknown;
  isSystem: boolean;
};

type VariantUomContext = {
  variantId: string;
  baseUom: UomRow;
  conversions: Array<{ uomId: string; factorToVariantBase: unknown }>;
};

@Injectable()
export class InventoryUomService {
  constructor(private readonly prisma: PrismaService) {}

  toDto(row: UomRow): UnitOfMeasure {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      dimension: row.dimension as UnitOfMeasure['dimension'],
      factorToDimensionBase: toNumber(row.factorToDimensionBase),
      isSystem: row.isSystem,
    };
  }

  async ensureDefaultUnits(
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    for (const unit of DEFAULT_UNITS) {
      const existing = await db.unitOfMeasure.findFirst({
        where: { organizationId, code: unit.code },
        select: { id: true },
      });
      if (existing) continue;
      await db.unitOfMeasure.create({
        data: {
          organizationId,
          code: unit.code,
          name: unit.name,
          dimension: unit.dimension,
          factorToDimensionBase: new Prisma.Decimal(unit.factor),
          isSystem: true,
        },
      });
    }
  }

  async listUnits(organizationId: string): Promise<UnitOfMeasureListResponse> {
    await this.ensureDefaultUnits(organizationId);
    const rows = await this.prisma.unitOfMeasure.findMany({
      where: { organizationId },
      orderBy: [{ dimension: 'asc' }, { code: 'asc' }],
    });
    return {
      items: rows.map((row) => this.toDto(row)),
      total: rows.length,
    };
  }

  async resolveUnit(
    organizationId: string,
    opts: { uomId?: string | null; uomCode?: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<UomRow> {
    await this.ensureDefaultUnits(organizationId, tx);
    const db = tx ?? this.prisma;
    const code = opts.uomCode?.trim();
    const row = opts.uomId
      ? await db.unitOfMeasure.findFirst({
          where: { id: opts.uomId, organizationId },
        })
      : code
        ? await db.unitOfMeasure.findFirst({
            where: { organizationId, code: { equals: code, mode: 'insensitive' } },
          })
        : null;
    if (!row) {
      throw new BadRequestException(
        code ? `Unknown unit of measure: ${code}` : 'Unit of measure is required',
      );
    }
    return row;
  }

  async resolveVariantBaseUomId(
    organizationId: string,
    opts: { baseUomId?: string | null; baseUomCode?: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    await this.ensureDefaultUnits(organizationId, tx);
    if (opts.baseUomId) {
      const byId = await this.resolveUnit(organizationId, { uomId: opts.baseUomId }, tx);
      return byId.id;
    }
    if (opts.baseUomCode?.trim()) {
      const byCode = await this.resolveUnit(
        organizationId,
        { uomCode: opts.baseUomCode },
        tx,
      );
      return byCode.id;
    }
    const pcs = await this.resolveUnit(organizationId, { uomCode: 'pcs' }, tx);
    return pcs.id;
  }

  private async loadVariantContext(
    organizationId: string,
    variantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<VariantUomContext> {
    await this.ensureDefaultUnits(organizationId, tx);
    const db = tx ?? this.prisma;
    const variant = await db.productVariant.findFirst({
      where: { id: variantId, organizationId },
      include: {
        baseUom: true,
        uomConversions: { select: { uomId: true, factorToVariantBase: true } },
      },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    let baseUom = variant.baseUom;
    if (!baseUom) {
      const pcsId = await this.resolveVariantBaseUomId(organizationId, { baseUomCode: 'pcs' }, tx);
      baseUom = await db.unitOfMeasure.findFirstOrThrow({ where: { id: pcsId } });
      await db.productVariant.update({
        where: { id: variantId },
        data: { baseUomId: pcsId },
      });
    }

    return {
      variantId,
      baseUom,
      conversions: variant.uomConversions,
    };
  }

  /**
   * Converts a quantity in the given UoM (or variant base when omitted) to variant base units (integer).
   */
  async convertToVariantBase(
    organizationId: string,
    variantId: string,
    quantity: number,
    opts?: { uomId?: string | null; uomCode?: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<{ baseQuantity: number; uomCode: string; baseUomCode: string }> {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive number');
    }

    const ctx = await this.loadVariantContext(organizationId, variantId, tx);
    const baseUom = ctx.baseUom;

    if (!opts?.uomId && !opts?.uomCode?.trim()) {
      return {
        baseQuantity: Math.max(1, Math.round(quantity)),
        uomCode: baseUom.code,
        baseUomCode: baseUom.code,
      };
    }

    const inputUom = await this.resolveUnit(organizationId, opts ?? {}, tx);

    if (inputUom.id === baseUom.id) {
      return {
        baseQuantity: Math.max(1, Math.round(quantity)),
        uomCode: inputUom.code,
        baseUomCode: baseUom.code,
      };
    }

    const variantConversion = ctx.conversions.find((c) => c.uomId === inputUom.id);
    if (variantConversion) {
      const factor = toNumber(variantConversion.factorToVariantBase);
      return {
        baseQuantity: Math.max(1, Math.round(quantity * factor)),
        uomCode: inputUom.code,
        baseUomCode: baseUom.code,
      };
    }

    if (inputUom.dimension !== baseUom.dimension) {
      throw new BadRequestException(
        `Cannot convert ${inputUom.code} (${inputUom.dimension}) to variant base ${baseUom.code} (${baseUom.dimension})`,
      );
    }

    const inputFactor = toNumber(inputUom.factorToDimensionBase);
    const baseFactor = toNumber(baseUom.factorToDimensionBase);
    if (baseFactor <= 0) {
      throw new BadRequestException('Invalid variant base unit configuration');
    }

    const dimensionBaseQty = quantity * inputFactor;
    const baseQty = dimensionBaseQty / baseFactor;

    return {
      baseQuantity: Math.max(1, Math.round(baseQty)),
      uomCode: inputUom.code,
      baseUomCode: baseUom.code,
    };
  }

  /** Converts quantity between two units in the same dimension (for cost/rate math). */
  convertInDimension(
    quantity: number,
    from: UomRow,
    to: UomRow,
  ): number {
    if (from.dimension !== to.dimension) {
      throw new BadRequestException(
        `Cannot convert ${from.code} to ${to.code}: different dimensions`,
      );
    }
    const fromFactor = toNumber(from.factorToDimensionBase);
    const toFactor = toNumber(to.factorToDimensionBase);
    if (toFactor <= 0) return quantity;
    return (quantity * fromFactor) / toFactor;
  }
}
