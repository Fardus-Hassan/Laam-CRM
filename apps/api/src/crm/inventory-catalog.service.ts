import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateProductBrandPayload,
  CreateProductPayload,
  InventoryProductDetail,
  InventoryProductListItem,
  OrgCategory,
  OrgCategoryKind,
  ProductBrand,
  ProductListQuery,
  ProductListResponse,
  ProductStatus,
  ProductVariant,
  RecycleBinItem,
  RecycleEntityType,
  RecycleListQuery,
  StockStatus,
  UpdateProductBrandPayload,
  UpdateProductPayload,
  UpsertOrgCategoryPayload,
} from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';
import type { InventoryAdvancedService } from './inventory-advanced.service';
import { InventoryUomService } from './inventory-uom.service';

// ─── Constants ──────────────────────────────────────────────────────────────

export const PRODUCT_CATEGORY_SEEDS: { slug: string; label: string }[] = [
  { slug: 'honey', label: 'Honey' },
  { slug: 'dates', label: 'Dates' },
  { slug: 'combo', label: 'Combo' },
  { slug: 'gift', label: 'Gift box' },
  { slug: 'raw_material', label: 'Raw material' },
  { slug: 'packaging', label: 'Packaging' },
  { slug: 'other', label: 'Other' },
];

const MAX_BULK_IDS = 100;
const DETAIL_ACTIVITY_LIMIT = 20;
const RECYCLE_RETENTION_DAYS = 30;

// ─── Helpers ────────────────────────────────────────────────────────────────

export function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64) || 'item'
  );
}

export function stockStatusFor(stock: number, reorderLevel: number): StockStatus {
  if (stock <= 0) return 'out_of_stock';
  if (stock <= reorderLevel) return 'low_stock';
  return 'in_stock';
}

export {
  type Actor,
  isUniqueConstraintError,
  toNumber,
} from './inventory-shared';
import { type Actor, isUniqueConstraintError, toNumber } from './inventory-shared';

function toNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  return toNumber(value);
}

function isPersistedVariantId(id: string | undefined | null): id is string {
  return Boolean(id) && !id!.startsWith('tmp-') && !id!.startsWith('new-');
}

// ─── Local types ────────────────────────────────────────────────────────────

export type StockAdjustmentInput = {
  variantId?: string;
  delta: number;
  reason: string;
  note?: string;
};

export type StockMovementItem = {
  id: string;
  productId: string;
  variantId: string;
  variantLabel?: string;
  variantSku?: string;
  delta: number;
  previousStock: number;
  newStock: number;
  reason: string;
  note?: string;
  actorName?: string;
  createdAt: string;
};

export type StockMovementListResponse = {
  items: StockMovementItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type BulkProductActionPayload = {
  productIds: string[];
  status?: ProductStatus;
  category?: string;
  stockDelta?: number;
};

export type BulkProductActionResult = {
  successCount: number;
  failedCount: number;
  errors: Array<{ id: string; message: string }>;
  message?: string;
};

type Tx = Prisma.TransactionClient;

type VariantRow = {
  id: string;
  label: string;
  sku: string;
  barcode?: string | null;
  baseUomId?: string | null;
  baseUom?: { id: string; code: string; name: string } | null;
  salePrice: unknown;
  costPrice: unknown;
  stock: number;
  reorderLevel: number;
  weightKg?: number;
};

type ActivityRow = {
  id: string;
  label: string;
  description: string | null;
  actorName: string | null;
  createdAt: Date;
};

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  imageUrl: string | null;
  imageKey?: string | null;
  status: string;
  reorderLevel: number;
  supplierName: string | null;
  notes: string | null;
  tags: string[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  brandId: string | null;
  categoryId: string | null;
  brand: { id: string; name: string } | null;
  category: { id: string; slug: string; label: string } | null;
  variants: VariantRow[];
  activities?: ActivityRow[];
};

const productListInclude = {
  brand: { select: { id: true, name: true } },
  category: { select: { id: true, slug: true, label: true } },
  variants: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      baseUom: { select: { id: true, code: true, name: true } },
    },
  },
};

const productInclude = {
  ...productListInclude,
  variants: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      baseUom: { select: { id: true, code: true, name: true } },
    },
  },
};

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class InventoryCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uom: InventoryUomService,
    @Inject(forwardRef(() => require('./inventory-advanced.service').InventoryAdvancedService))
    private readonly advanced: InventoryAdvancedService,
  ) {}

  /** Products at or below reorder level with stock still > 0 (sidebar badge). */
  async lowStockCount(organizationId: string): Promise<number> {
    const { summary } = await this.buildSummary(organizationId);
    return summary.lowStockCount;
  }

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }
  }

  // ─── Brands ───────────────────────────────────────────────────────────────

  async listBrands(organizationId: string): Promise<ProductBrand[]> {
    const rows = await this.prisma.productBrand.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ name: 'asc' }],
    });
    return rows.map((row) => this.toBrand(row));
  }

  async createBrand(
    organizationId: string,
    input: CreateProductBrandPayload,
    actor?: Actor,
  ): Promise<ProductBrand> {
    const name = input.name.trim();
    if (!name) throw new BadRequestException('Brand name is required');
    const slug = input.slug?.trim() ? slugify(input.slug) : slugify(name);

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.productBrand.create({
          data: {
            organizationId,
            name,
            slug,
            description: input.description?.trim() || null,
            isActive: input.isActive ?? true,
          },
        });
        await this.logActivity(tx, organizationId, {
          entityType: 'brand',
          entityId: created.id,
          action: 'created',
          label: `Brand "${created.name}" created`,
          actor,
        });
        return created;
      });
      return this.toBrand(row);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A brand with this slug already exists');
      }
      throw error;
    }
  }

  async updateBrand(
    organizationId: string,
    id: string,
    input: UpdateProductBrandPayload,
    actor?: Actor,
  ): Promise<ProductBrand> {
    const existing = await this.prisma.productBrand.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Brand not found');

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.productBrand.update({
          where: { id },
          data: {
            name: input.name?.trim(),
            slug: input.slug !== undefined ? slugify(input.slug) : undefined,
            description:
              input.description === undefined ? undefined : input.description.trim() || null,
            isActive: input.isActive,
          },
        });
        await this.logActivity(tx, organizationId, {
          entityType: 'brand',
          entityId: updated.id,
          action: 'updated',
          label: `Brand "${updated.name}" updated`,
          actor,
        });
        return updated;
      });
      return this.toBrand(row);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A brand with this slug already exists');
      }
      throw error;
    }
  }

  async deleteBrand(organizationId: string, id: string, actor?: Actor): Promise<void> {
    const existing = await this.prisma.productBrand.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Brand not found');

    const inUse = await this.prisma.product.count({
      where: { brandId: id, deletedAt: null },
    });
    if (inUse > 0) {
      throw new BadRequestException(
        'Cannot delete brand while active products reference it. Deactivate it instead.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productBrand.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
      await this.logActivity(tx, organizationId, {
        entityType: 'brand',
        entityId: id,
        action: 'soft_deleted',
        label: `Brand "${existing.name}" archived`,
        actor,
      });
    });
  }

  async restoreBrand(
    organizationId: string,
    id: string,
    actor?: Actor,
  ): Promise<ProductBrand> {
    const existing = await this.prisma.productBrand.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Brand not found');
    if (!existing.deletedAt) {
      throw new BadRequestException('Brand is not archived');
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.productBrand.update({
        where: { id },
        data: { deletedAt: null, isActive: true },
      });
      await this.logActivity(tx, organizationId, {
        entityType: 'brand',
        entityId: id,
        action: 'restored',
        label: `Brand "${existing.name}" restored`,
        actor,
      });
      return updated;
    });
    return this.toBrand(row);
  }

  async hardDeleteBrand(organizationId: string, id: string, actor?: Actor): Promise<void> {
    const existing = await this.prisma.productBrand.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Brand not found');
    if (!existing.deletedAt) {
      throw new BadRequestException('Archive the brand before permanently deleting it');
    }

    const activeRefs = await this.prisma.product.count({
      where: { brandId: id, deletedAt: null },
    });
    if (activeRefs > 0) {
      throw new BadRequestException('Cannot permanently delete brand while active products reference it');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.updateMany({ where: { brandId: id }, data: { brandId: null } });
      await tx.productBrand.delete({ where: { id } });
      await this.logActivity(tx, organizationId, {
        entityType: 'brand',
        entityId: id,
        action: 'hard_deleted',
        label: `Brand "${existing.name}" permanently deleted`,
        actor,
      });
    });
  }

  // ─── Categories ───────────────────────────────────────────────────────────

  /** Idempotent — safe to call concurrently thanks to skipDuplicates. */
  async ensureDefaultCategories(organizationId: string): Promise<void> {
    const existing = await this.prisma.orgCategory.count({
      where: { organizationId, kind: 'product' },
    });
    if (existing >= PRODUCT_CATEGORY_SEEDS.length) return;

    await this.prisma.orgCategory.createMany({
      data: PRODUCT_CATEGORY_SEEDS.map((seed, index) => ({
        organizationId,
        kind: 'product',
        slug: seed.slug,
        label: seed.label,
        sortOrder: index,
        isActive: true,
        isSystem: seed.slug === 'other',
      })),
      skipDuplicates: true,
    });
  }

  async listCategories(
    organizationId: string,
    kind?: OrgCategoryKind,
  ): Promise<OrgCategory[]> {
    if (!kind || kind === 'product') {
      await this.ensureDefaultCategories(organizationId);
    }
    const rows = await this.prisma.orgCategory.findMany({
      where: { organizationId, deletedAt: null, ...(kind ? { kind } : {}) },
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });
    return rows.map((row) => this.toCategory(row));
  }

  async getCategory(
    organizationId: string,
    id: string,
  ): Promise<OrgCategory> {
    const row = await this.prisma.orgCategory.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Category not found');
    return this.toCategory(row);
  }

  async upsertCategory(
    organizationId: string,
    input: UpsertOrgCategoryPayload,
    actor?: Actor,
  ): Promise<OrgCategory> {
    const label = input.label.trim();
    if (!label) throw new BadRequestException('Label is required');
    const slug = slugify(input.slug || label);

    if (input.id) {
      const existing = await this.prisma.orgCategory.findFirst({
        where: { id: input.id, organizationId, deletedAt: null },
      });
      if (!existing) throw new NotFoundException('Category not found');
      if (existing.isSystem && input.isSystem === false) {
        throw new BadRequestException('System categories cannot lose their system flag');
      }
      if (existing.isSystem && slug !== existing.slug) {
        throw new BadRequestException('System category slugs cannot be changed');
      }

      try {
        const row = await this.prisma.$transaction(async (tx) => {
          const updated = await tx.orgCategory.update({
            where: { id: existing.id },
            data: {
              label,
              slug,
              description:
                input.description === undefined
                  ? undefined
                  : input.description?.trim() || null,
              sortOrder: input.sortOrder ?? existing.sortOrder,
              isActive: input.isActive ?? existing.isActive,
              // isSystem is server-controlled and never toggled by clients.
            },
          });
          await this.logActivity(tx, organizationId, {
            entityType: 'category',
            entityId: updated.id,
            action: 'updated',
            label: `Category "${updated.label}" updated`,
            actor,
          });
          return updated;
        });
        return this.toCategory(row);
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new ConflictException('A category with this slug already exists');
        }
        throw error;
      }
    }

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.orgCategory.create({
          data: {
            organizationId,
            kind: input.kind,
            slug,
            label,
            description: input.description?.trim() || null,
            sortOrder: input.sortOrder ?? 0,
            isActive: input.isActive ?? true,
            // Clients can never create system categories; only seeds do.
            isSystem: false,
          },
        });
        await this.logActivity(tx, organizationId, {
          entityType: 'category',
          entityId: created.id,
          action: 'created',
          label: `Category "${created.label}" created`,
          actor,
        });
        return created;
      });
      return this.toCategory(row);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A category with this slug already exists');
      }
      throw error;
    }
  }

  async setCategoryActive(
    organizationId: string,
    id: string,
    isActive: boolean,
    actor?: Actor,
  ): Promise<OrgCategory> {
    const existing = await this.prisma.orgCategory.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Category not found');

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.orgCategory.update({
        where: { id },
        data: { isActive },
      });
      await this.logActivity(tx, organizationId, {
        entityType: 'category',
        entityId: id,
        action: isActive ? 'activated' : 'deactivated',
        label: `Category "${existing.label}" ${isActive ? 'activated' : 'deactivated'}`,
        actor,
      });
      return updated;
    });
    return this.toCategory(row);
  }

  async deleteCategory(organizationId: string, id: string, actor?: Actor): Promise<void> {
    const existing = await this.prisma.orgCategory.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Category not found');
    if (existing.isSystem) {
      throw new BadRequestException('System categories cannot be deleted');
    }

    const inUse = await this.prisma.product.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (inUse > 0) {
      throw new BadRequestException(
        'Cannot delete category while active products reference it. Deactivate it instead.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orgCategory.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
      await this.logActivity(tx, organizationId, {
        entityType: 'category',
        entityId: id,
        action: 'soft_deleted',
        label: `Category "${existing.label}" archived`,
        actor,
      });
    });
  }

  async restoreCategory(
    organizationId: string,
    id: string,
    actor?: Actor,
  ): Promise<OrgCategory> {
    const existing = await this.prisma.orgCategory.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Category not found');
    if (!existing.deletedAt) {
      throw new BadRequestException('Category is not archived');
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.orgCategory.update({
        where: { id },
        data: { deletedAt: null, isActive: true },
      });
      await this.logActivity(tx, organizationId, {
        entityType: 'category',
        entityId: id,
        action: 'restored',
        label: `Category "${existing.label}" restored`,
        actor,
      });
      return updated;
    });
    return this.toCategory(row);
  }

  async hardDeleteCategory(organizationId: string, id: string, actor?: Actor): Promise<void> {
    const existing = await this.prisma.orgCategory.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Category not found');
    if (!existing.deletedAt) {
      throw new BadRequestException('Archive the category before permanently deleting it');
    }
    if (existing.isSystem) {
      throw new BadRequestException('System categories cannot be permanently deleted');
    }

    const activeRefs = await this.prisma.product.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (activeRefs > 0) {
      throw new BadRequestException(
        'Cannot permanently delete category while active products reference it',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
      await tx.orgCategory.delete({ where: { id } });
      await this.logActivity(tx, organizationId, {
        entityType: 'category',
        entityId: id,
        action: 'hard_deleted',
        label: `Category "${existing.label}" permanently deleted`,
        actor,
      });
    });
  }

  // ─── Products: list / get ─────────────────────────────────────────────────

  async listProducts(
    organizationId: string,
    query: ProductListQuery,
  ): Promise<ProductListResponse> {
    await this.ensureDefaultCategories(organizationId);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(Math.max(1, query.pageSize ?? 20), 100);
    const search = query.search?.trim();

    const where: Prisma.ProductWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.category
        ? { category: { slug: query.category, organizationId, kind: 'product' } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
              { tags: { has: search } },
            ],
          }
        : {}),
    };

    if (query.filter === 'active') {
      where.status = 'active';
    } else if (query.filter === 'inactive') {
      where.status = { in: ['inactive', 'discontinued'] };
    } else if (query.filter === 'low_stock' || query.filter === 'out_of_stock') {
      const ids = await this.productIdsByStockStatus(organizationId, query.filter);
      if (ids.length === 0) {
        const summary = await this.buildSummary(organizationId);
        return {
          items: [],
          total: 0,
          page,
          pageSize,
          summary: summary.summary,
          filters: summary.filters,
        };
      }
      where.id = { in: ids };
    }

    const [total, rows, summaryData] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: productListInclude,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.buildSummary(organizationId),
    ]);

    return {
      items: rows.map((row) => this.toListItem(row)),
      total,
      page,
      pageSize,
      summary: summaryData.summary,
      filters: summaryData.filters,
    };
  }

  async getProduct(
    organizationId: string,
    id: string,
    options?: { includeDeleted?: boolean },
  ): Promise<InventoryProductDetail> {
    const row = await this.prisma.product.findFirst({
      where: {
        id,
        organizationId,
        ...(options?.includeDeleted ? {} : { deletedAt: null }),
      },
      include: {
        ...productInclude,
        activities: {
          orderBy: { createdAt: 'desc' as const },
          take: DETAIL_ACTIVITY_LIMIT,
        },
      },
    });
    if (!row) throw new NotFoundException('Product not found');
    return this.toDetail(row);
  }

  // ─── Products: create / update ────────────────────────────────────────────

  async createProduct(
    organizationId: string,
    input: CreateProductPayload,
    actor?: Actor,
  ): Promise<InventoryProductDetail> {
    await this.ensureDefaultCategories(organizationId);

    const name = input.name.trim();
    if (!name) throw new BadRequestException('Product name is required');
    const sku = input.sku.trim().toUpperCase();
    if (!sku) throw new BadRequestException('Product SKU is required');
    if (!input.variants?.length) {
      throw new BadRequestException('At least one variant is required');
    }
    this.assertUniqueVariantSkus(input.variants.map((v) => v.sku));

    const categoryId = await this.resolveCategoryId(organizationId, {
      categoryId: input.categoryId,
      slug: input.category,
      fallbackToOther: true,
    });
    if (input.brandId) {
      await this.requireBrand(organizationId, input.brandId);
    }

    try {
      const productId = await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            organizationId,
            name,
            sku,
            brandId: input.brandId || null,
            categoryId,
            description: input.description?.trim() || null,
            imageUrl: input.imageUrl?.trim() || null,
            imageKey: (input as { imageKey?: string }).imageKey?.trim() || null,
            status: input.status ?? 'active',
            reorderLevel: input.reorderLevel ?? 5,
            supplierName: input.supplierName?.trim() || null,
            notes: input.notes?.trim() || null,
            tags: input.tags ?? [],
          },
        });

        for (const v of input.variants) {
          const barcode = v.barcode?.trim() || null;
          const baseUomId = await this.uom.resolveVariantBaseUomId(organizationId, {
            baseUomId: v.baseUomId,
            baseUomCode: v.baseUomCode,
          }, tx);
          const variant = await tx.productVariant.create({
            data: {
              organizationId,
              productId: product.id,
              label: v.label.trim() || 'Standard',
              sku: v.sku.trim().toUpperCase(),
              barcode,
              baseUomId,
              salePrice: new Prisma.Decimal(v.salePrice),
              costPrice: v.costPrice != null ? new Prisma.Decimal(v.costPrice) : null,
              weightKg: Number(v.weightKg ?? 0.5) > 0 ? Number(v.weightKg ?? 0.5) : 0.5,
              stock: v.stock ?? 0,
              reorderLevel: v.reorderLevel ?? input.reorderLevel ?? 5,
            },
          });
          if (variant.stock > 0) {
            let warehouse = await tx.warehouse.findFirst({
              where: { organizationId, isDefault: true },
            });
            if (!warehouse) {
              warehouse = await tx.warehouse.create({
                data: {
                  organizationId,
                  code: 'MAIN',
                  name: 'Main warehouse',
                  isDefault: true,
                  isActive: true,
                },
              });
            }
            await tx.inventoryStockLevel.create({
              data: {
                organizationId,
                warehouseId: warehouse.id,
                variantId: variant.id,
                quantity: variant.stock,
              },
            });
            await tx.inventoryStockMovement.create({
              data: {
                organizationId,
                productId: product.id,
                variantId: variant.id,
                warehouseId: warehouse.id,
                delta: variant.stock,
                previousStock: 0,
                newStock: variant.stock,
                unitCost: variant.costPrice,
                valueDelta:
                  variant.costPrice == null
                    ? null
                    : new Prisma.Decimal(variant.stock).mul(variant.costPrice),
                reason: 'initial_stock',
                note: 'Opening stock on product creation',
                actorUserId: actor?.userId ?? null,
                actorName: actor?.name ?? null,
              },
            });
          }
        }

        await this.logActivity(tx, organizationId, {
          entityType: 'product',
          entityId: product.id,
          productId: product.id,
          action: 'created',
          label: `Product "${product.name}" created`,
          description: `SKU ${product.sku}, ${input.variants.length} variant(s)`,
          actor,
        });

        return product.id;
      });

      return this.getProduct(organizationId, productId);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A product or variant with this SKU already exists');
      }
      throw error;
    }
  }

  /**
   * Catalog edit. Variant handling:
   * - existing variants (persisted ids) are updated in place: label / sku /
   *   prices / reorderLevel. An absolute `stock` value in the payload is
   *   treated as an admin stock correction — it is applied and a
   *   `catalog_edit` InventoryStockMovement is written for the difference.
   * - variants missing from the payload are deleted (their movements cascade).
   * - variants with tmp-/new-/no ids are created (with an `initial_stock`
   *   movement when stock > 0).
   * - `stockAdjustment` (legacy) is still honored: it delegates to the same
   *   ledger-backed adjustment logic inside this transaction, before variant
   *   upserts. Prefer calling adjustStock() directly.
   */
  async updateProduct(
    organizationId: string,
    id: string,
    input: UpdateProductPayload,
    actor?: Actor,
  ): Promise<InventoryProductDetail> {
    const existing = await this.prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { variants: true },
    });
    if (!existing) throw new NotFoundException('Product not found');

    if (input.brandId) {
      await this.requireBrand(organizationId, input.brandId, {
        currentBrandId: existing.brandId,
      });
    }

    let categoryId: string | null | undefined;
    if (input.categoryId !== undefined) {
      categoryId = await this.resolveCategoryId(organizationId, {
        categoryId: input.categoryId,
        currentCategoryId: existing.categoryId,
      });
    } else if (input.category) {
      categoryId = await this.resolveCategoryId(organizationId, {
        slug: input.category,
        currentCategoryId: existing.categoryId,
      });
    }

    if (input.variants) {
      if (input.variants.length === 0) {
        throw new BadRequestException('At least one variant is required');
      }
      this.assertUniqueVariantSkus(input.variants.map((v) => v.sku));
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Legacy stock adjustment support — same ledger path as adjustStock().
        if (input.stockAdjustment && input.stockAdjustment.delta !== 0) {
          await this.applyStockDelta(tx, organizationId, existing.id, {
            variantId: input.stockAdjustment.variantId,
            delta: input.stockAdjustment.delta,
            reason: input.stockAdjustment.reason || 'manual_adjustment',
          }, actor);
        }

        if (input.variants) {
          const incomingIds = new Set(
            input.variants.map((v) => v.id).filter(isPersistedVariantId),
          );
          const toDelete = existing.variants.filter((v) => !incomingIds.has(v.id));
          if (toDelete.length) {
            await tx.productVariant.deleteMany({
              where: { id: { in: toDelete.map((v) => v.id) }, organizationId },
            });
          }

          for (const v of input.variants) {
            const persistedId =
              isPersistedVariantId(v.id) && existing.variants.some((ev) => ev.id === v.id)
                ? v.id
                : null;

            if (persistedId) {
              const baseUomId = await this.uom.resolveVariantBaseUomId(organizationId, {
                baseUomId: v.baseUomId,
                baseUomCode: v.baseUomCode,
              }, tx);
              await tx.productVariant.update({
                where: { id: persistedId },
                data: {
                  label: v.label.trim() || 'Standard',
                  sku: v.sku.trim().toUpperCase(),
                  barcode: v.barcode?.trim() || null,
                  baseUomId,
                  salePrice: new Prisma.Decimal(v.salePrice),
                  costPrice: v.costPrice != null ? new Prisma.Decimal(v.costPrice) : null,
                  weightKg:
                    v.weightKg != null && Number(v.weightKg) > 0
                      ? Number(v.weightKg)
                      : undefined,
                  reorderLevel: v.reorderLevel ?? existing.reorderLevel,
                },
              });

              // Absolute stock set from a catalog edit → ledger the diff.
              if (v.stock != null) {
                const current = await tx.productVariant.findUniqueOrThrow({
                  where: { id: persistedId },
                  select: { stock: true },
                });
                const target = Math.max(0, Math.trunc(v.stock));
                if (target !== current.stock) {
                  await tx.productVariant.update({
                    where: { id: persistedId },
                    data: { stock: target },
                  });
                  await tx.inventoryStockMovement.create({
                    data: {
                      organizationId,
                      productId: existing.id,
                      variantId: persistedId,
                      delta: target - current.stock,
                      previousStock: current.stock,
                      newStock: target,
                      reason: 'catalog_edit',
                      note: 'Absolute stock set from product edit',
                      actorUserId: actor?.userId ?? null,
                      actorName: actor?.name ?? null,
                    },
                  });
                }
              }
            } else {
              const stock = Math.max(0, Math.trunc(v.stock ?? 0));
              const baseUomId = await this.uom.resolveVariantBaseUomId(organizationId, {
                baseUomId: v.baseUomId,
                baseUomCode: v.baseUomCode,
              }, tx);
              const created = await tx.productVariant.create({
                data: {
                  organizationId,
                  productId: existing.id,
                  label: v.label.trim() || 'Standard',
                  sku: v.sku.trim().toUpperCase(),
                  barcode: v.barcode?.trim() || null,
                  baseUomId,
                  salePrice: new Prisma.Decimal(v.salePrice),
                  costPrice: v.costPrice != null ? new Prisma.Decimal(v.costPrice) : null,
                  weightKg: Number(v.weightKg ?? 0.5) > 0 ? Number(v.weightKg ?? 0.5) : 0.5,
                  stock,
                  reorderLevel: v.reorderLevel ?? existing.reorderLevel,
                },
              });
              if (stock > 0) {
                await tx.inventoryStockMovement.create({
                  data: {
                    organizationId,
                    productId: existing.id,
                    variantId: created.id,
                    delta: stock,
                    previousStock: 0,
                    newStock: stock,
                    reason: 'initial_stock',
                    note: 'Variant added via product edit',
                    actorUserId: actor?.userId ?? null,
                    actorName: actor?.name ?? null,
                  },
                });
              }
            }
          }
        }

        await tx.product.update({
          where: { id },
          data: {
            name: input.name?.trim(),
            sku: input.sku?.trim().toUpperCase(),
            brandId: input.brandId === undefined ? undefined : input.brandId,
            categoryId: categoryId === undefined ? undefined : categoryId,
            description:
              input.description === undefined ? undefined : input.description.trim() || null,
            imageUrl:
              input.imageUrl === undefined ? undefined : input.imageUrl.trim() || null,
            imageKey:
              (input as { imageKey?: string | null }).imageKey === undefined
                ? undefined
                : (input as { imageKey?: string | null }).imageKey?.trim() || null,
            status: input.status,
            reorderLevel: input.reorderLevel,
            supplierName:
              input.supplierName === undefined
                ? undefined
                : input.supplierName.trim() || null,
            notes: input.notes === undefined ? undefined : input.notes.trim() || null,
            tags: input.tags,
          },
        });

        await this.logActivity(tx, organizationId, {
          entityType: 'product',
          entityId: id,
          productId: id,
          action: 'updated',
          label: `Product "${input.name?.trim() || existing.name}" updated`,
          actor,
        });
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A product or variant with this SKU already exists');
      }
      throw error;
    }

    return this.getProduct(organizationId, id);
  }

  // ─── Products: stock ──────────────────────────────────────────────────────

  async adjustStock(
    organizationId: string,
    productId: string,
    input: StockAdjustmentInput,
    actor?: Actor,
  ): Promise<InventoryProductDetail> {
    if (!Number.isInteger(input.delta) || input.delta === 0) {
      throw new BadRequestException('Delta must be a non-zero integer');
    }

    await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!product) throw new NotFoundException('Product not found');

      let variantId = input.variantId;
      if (!variantId) {
        const first = await tx.productVariant.findFirst({
          where: { productId, organizationId },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        if (!first) throw new BadRequestException('Product has no variants to adjust');
        variantId = first.id;
      }

      const qty = Math.abs(input.delta);
      if (input.delta < 0) {
        const writeoffReasons = ['damage', 'expiry', 'theft_loss', 'gift_sample'];
        await this.advanced.consumeStock(tx, organizationId, {
          productId,
          variantId,
          quantity: qty,
          preferFefo: true,
          reason: input.reason,
          note: input.note,
          sourceType: 'stock_adjustment',
          sourceId: productId,
          actor,
          journalKind: writeoffReasons.includes(input.reason) ? 'writeoff' : undefined,
          journalEventKey: `writeoff:${productId}:${variantId}:${Date.now()}`,
          journalDescription: `Stock write-off (${input.reason})`,
        });
      } else {
        await this.advanced.receiveStock(tx, organizationId, {
          productId,
          variantId,
          quantity: qty,
          createLot: true,
          lot: { lotNumber: `ADJ-${Date.now().toString(36)}` },
          reason: input.reason,
          note: input.note,
          sourceType: 'stock_adjustment',
          sourceId: productId,
          actor,
        });
      }

      await this.logActivity(tx, organizationId, {
        entityType: 'product',
        entityId: productId,
        productId,
        action: 'stock_adjusted',
        label: `Stock ${input.delta > 0 ? '+' : ''}${input.delta} (${input.reason})`,
        actor,
      });
    });

    return this.getProduct(organizationId, productId);
  }

  async listStockMovements(
    organizationId: string,
    productId: string,
    query: { page?: number; pageSize?: number },
  ): Promise<StockMovementListResponse> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(Math.max(1, query.pageSize ?? 20), 100);
    const where = { organizationId, productId };

    const [total, rows] = await Promise.all([
      this.prisma.inventoryStockMovement.count({ where }),
      this.prisma.inventoryStockMovement.findMany({
        where,
        include: { variant: { select: { label: true, sku: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        productId: row.productId,
        variantId: row.variantId,
        variantLabel: row.variant?.label,
        variantSku: row.variant?.sku,
        delta: row.delta,
        previousStock: row.previousStock,
        newStock: row.newStock,
        reason: row.reason,
        note: row.note ?? undefined,
        actorName: row.actorName ?? undefined,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  // ─── Products: delete / restore ───────────────────────────────────────────

  async softDeleteProduct(organizationId: string, id: string, actor?: Actor): Promise<void> {
    const existing = await this.prisma.product.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Product not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'discontinued' },
      });
      await this.logActivity(tx, organizationId, {
        entityType: 'product',
        entityId: id,
        productId: id,
        action: 'soft_deleted',
        label: `Product "${existing.name}" archived`,
        actor,
      });
    });
  }

  /** Kept for existing controllers: delete = soft delete. */
  async deleteProduct(organizationId: string, id: string, actor?: Actor): Promise<void> {
    return this.softDeleteProduct(organizationId, id, actor);
  }

  async restoreProduct(
    organizationId: string,
    id: string,
    actor?: Actor,
  ): Promise<InventoryProductDetail> {
    const existing = await this.prisma.product.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Product not found');
    if (!existing.deletedAt) {
      throw new BadRequestException('Product is not archived');
    }

    // The (organizationId, sku) unique constraint also covers soft-deleted
    // rows, so a conflicting active product cannot exist — but check anyway
    // in case the constraint semantics ever change.
    const conflict = await this.prisma.product.findFirst({
      where: { organizationId, sku: existing.sku, deletedAt: null, NOT: { id } },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('Another product with this SKU already exists');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { deletedAt: null, status: 'inactive' },
      });
      await this.logActivity(tx, organizationId, {
        entityType: 'product',
        entityId: id,
        productId: id,
        action: 'restored',
        label: `Product "${existing.name}" restored`,
        actor,
      });
    });

    return this.getProduct(organizationId, id);
  }

  async hardDeleteProduct(organizationId: string, id: string, actor?: Actor): Promise<void> {
    const existing = await this.prisma.product.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Product not found');
    if (!existing.deletedAt) {
      throw new BadRequestException('Archive the product before permanently deleting it');
    }

    await this.prisma.$transaction(async (tx) => {
      // Variants / movements / product-linked activities cascade via FK.
      await tx.product.delete({ where: { id } });
      await this.logActivity(tx, organizationId, {
        entityType: 'product',
        entityId: id,
        action: 'hard_deleted',
        label: `Product "${existing.name}" permanently deleted`,
        actor,
      });
    });
  }

  // ─── Recycle bin ──────────────────────────────────────────────────────────

  async listRecycleBin(
    organizationId: string,
    query?: RecycleListQuery,
  ): Promise<RecycleBinItem[]> {
    const search = query?.search?.trim().toLowerCase();
    const typeFilter = query?.entityType;
    const items: RecycleBinItem[] = [];

    const includeProducts = !typeFilter || typeFilter === 'product';
    const includeBrands = !typeFilter || typeFilter === 'brand';
    const includeCategories = !typeFilter || typeFilter === 'category';

    if (includeProducts) {
      const products = await this.prisma.product.findMany({
        where: { organizationId, deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        include: {
          brand: { select: { name: true } },
          category: { select: { label: true } },
        },
      });
      const activities = await this.latestSoftDeleteActors(
        organizationId,
        'product',
        products.map((p) => p.id),
      );
      for (const product of products) {
        const deletedAt = product.deletedAt!;
        items.push({
          id: `product:${product.id}`,
          entityType: 'product',
          entityId: product.id,
          title: product.name,
          subtitle: [product.sku, product.brand?.name, product.category?.label]
            .filter(Boolean)
            .join(' · '),
          deletedBy: activities.get(product.id) ?? 'Unknown',
          deletedAt: deletedAt.toISOString(),
          purgeAt: this.purgeAt(deletedAt).toISOString(),
        });
      }
    }

    if (includeBrands) {
      const brands = await this.prisma.productBrand.findMany({
        where: { organizationId, deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
      });
      const activities = await this.latestSoftDeleteActors(
        organizationId,
        'brand',
        brands.map((b) => b.id),
      );
      for (const brand of brands) {
        const deletedAt = brand.deletedAt!;
        items.push({
          id: `brand:${brand.id}`,
          entityType: 'brand',
          entityId: brand.id,
          title: brand.name,
          subtitle: brand.slug,
          deletedBy: activities.get(brand.id) ?? 'Unknown',
          deletedAt: deletedAt.toISOString(),
          purgeAt: this.purgeAt(deletedAt).toISOString(),
        });
      }
    }

    if (includeCategories) {
      const categories = await this.prisma.orgCategory.findMany({
        where: { organizationId, deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
      });
      const activities = await this.latestSoftDeleteActors(
        organizationId,
        'category',
        categories.map((c) => c.id),
      );
      for (const category of categories) {
        const deletedAt = category.deletedAt!;
        items.push({
          id: `category:${category.id}`,
          entityType: 'category',
          entityId: category.id,
          title: category.label,
          subtitle: `${category.kind} · ${category.slug}`,
          deletedBy: activities.get(category.id) ?? 'Unknown',
          deletedAt: deletedAt.toISOString(),
          purgeAt: this.purgeAt(deletedAt).toISOString(),
        });
      }
    }

    const filtered = search
      ? items.filter(
          (item) =>
            item.title.toLowerCase().includes(search) ||
            item.subtitle?.toLowerCase().includes(search) ||
            item.deletedBy.toLowerCase().includes(search),
        )
      : items;

    return filtered.sort(
      (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
    );
  }

  async restoreRecycleItem(
    organizationId: string,
    recycleId: string,
    actor?: Actor,
  ): Promise<void> {
    const { entityType, entityId } = this.parseRecycleId(recycleId);
    if (entityType === 'product') {
      await this.restoreProduct(organizationId, entityId, actor);
      return;
    }
    if (entityType === 'brand') {
      await this.restoreBrand(organizationId, entityId, actor);
      return;
    }
    if (entityType === 'category') {
      await this.restoreCategory(organizationId, entityId, actor);
      return;
    }
    throw new BadRequestException(`Restore is not supported for ${entityType} yet`);
  }

  async purgeRecycleItem(
    organizationId: string,
    recycleId: string,
    actor?: Actor,
  ): Promise<void> {
    const { entityType, entityId } = this.parseRecycleId(recycleId);
    if (entityType === 'product') {
      await this.hardDeleteProduct(organizationId, entityId, actor);
      return;
    }
    if (entityType === 'brand') {
      await this.hardDeleteBrand(organizationId, entityId, actor);
      return;
    }
    if (entityType === 'category') {
      await this.hardDeleteCategory(organizationId, entityId, actor);
      return;
    }
    throw new BadRequestException(`Purge is not supported for ${entityType} yet`);
  }

  private parseRecycleId(recycleId: string): {
    entityType: RecycleEntityType;
    entityId: string;
  } {
    const separator = recycleId.indexOf(':');
    if (separator <= 0) {
      // Backward-compatible: bare UUID treated as product.
      return { entityType: 'product', entityId: recycleId };
    }
    const entityType = recycleId.slice(0, separator) as RecycleEntityType;
    const entityId = recycleId.slice(separator + 1);
    if (!entityId || !['product', 'brand', 'category', 'order', 'customer', 'lead', 'contact'].includes(entityType)) {
      throw new BadRequestException('Invalid recycle bin item id');
    }
    return { entityType, entityId };
  }

  private purgeAt(deletedAt: Date): Date {
    const at = new Date(deletedAt);
    at.setDate(at.getDate() + RECYCLE_RETENTION_DAYS);
    return at;
  }

  private async latestSoftDeleteActors(
    organizationId: string,
    entityType: string,
    entityIds: string[],
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!entityIds.length) return map;
    const rows = await this.prisma.catalogActivity.findMany({
      where: {
        organizationId,
        entityType,
        entityId: { in: entityIds },
        action: 'soft_deleted',
      },
      orderBy: { createdAt: 'desc' },
      select: { entityId: true, actorName: true },
    });
    for (const row of rows) {
      if (!map.has(row.entityId)) {
        map.set(row.entityId, row.actorName?.trim() || 'Unknown');
      }
    }
    return map;
  }

  // ─── Products: bulk ───────────────────────────────────────────────────────

  async bulkProductAction(
    organizationId: string,
    payload: BulkProductActionPayload,
    actor?: Actor,
  ): Promise<BulkProductActionResult> {
    const ids = [...new Set(payload.productIds.filter(Boolean))];
    if (ids.length === 0) {
      throw new BadRequestException('No product ids provided');
    }
    if (ids.length > MAX_BULK_IDS) {
      throw new BadRequestException(`At most ${MAX_BULK_IDS} products per bulk action`);
    }

    const categoryId = payload.category
      ? await this.resolveCategoryId(organizationId, { slug: payload.category })
      : undefined;

    let successCount = 0;
    const errors: Array<{ id: string; message: string }> = [];

    for (const id of ids) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const product = await tx.product.findFirst({
            where: { id, organizationId, deletedAt: null },
            include: { variants: { orderBy: { createdAt: 'asc' } } },
          });
          if (!product) throw new NotFoundException('Product not found');

          const data: Prisma.ProductUpdateInput = {};
          if (payload.status) data.status = payload.status;
          if (categoryId) data.category = { connect: { id: categoryId } };
          if (Object.keys(data).length > 0) {
            await tx.product.update({ where: { id }, data });
          }

          if (typeof payload.stockDelta === 'number' && payload.stockDelta !== 0) {
            await this.applyStockDelta(
              tx,
              organizationId,
              id,
              { delta: payload.stockDelta, reason: 'bulk_adjustment' },
              actor,
            );
          }

          await this.logActivity(tx, organizationId, {
            entityType: 'product',
            entityId: id,
            productId: id,
            action: 'bulk_updated',
            label: `Product "${product.name}" bulk-updated`,
            actor,
          });
        });
        successCount += 1;
      } catch (error) {
        errors.push({
          id,
          message: error instanceof Error ? error.message : 'Update failed',
        });
      }
    }

    return {
      successCount,
      failedCount: errors.length,
      errors,
      message: `Updated ${successCount} product(s)`,
    };
  }

  // ─── Internal: stock ledger ───────────────────────────────────────────────

  /**
   * Applies a stock delta atomically inside an existing transaction. The
   * negative-stock guard lives in the updateMany WHERE clause so concurrent
   * decrements cannot drive stock below zero (optimistic "FOR UPDATE").
   */
  private async applyStockDelta(
    tx: Tx,
    organizationId: string,
    productId: string,
    input: StockAdjustmentInput,
    actor?: Actor,
  ): Promise<void> {
    let variantId = input.variantId;
    if (!variantId) {
      const first = await tx.productVariant.findFirst({
        where: { productId, organizationId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (!first) throw new BadRequestException('Product has no variants to adjust');
      variantId = first.id;
    }

    const result = await tx.productVariant.updateMany({
      where: {
        id: variantId,
        productId,
        organizationId,
        ...(input.delta < 0 ? { stock: { gte: -input.delta } } : {}),
      },
      data: { stock: { increment: input.delta } },
    });
    if (result.count !== 1) {
      const exists = await tx.productVariant.findFirst({
        where: { id: variantId, productId, organizationId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Variant not found');
      throw new BadRequestException('Insufficient stock for this adjustment');
    }

    const updated = await tx.productVariant.findUniqueOrThrow({
      where: { id: variantId },
      select: { stock: true, label: true },
    });
    const newStock = updated.stock;
    const previousStock = newStock - input.delta;

    await tx.inventoryStockMovement.create({
      data: {
        organizationId,
        productId,
        variantId,
        delta: input.delta,
        previousStock,
        newStock,
        reason: input.reason || 'manual_adjustment',
        note: input.note?.trim() || null,
        actorUserId: actor?.userId ?? null,
        actorName: actor?.name ?? null,
      },
    });

    await this.logActivity(tx, organizationId, {
      entityType: 'variant',
      entityId: variantId,
      productId,
      action: 'stock_adjusted',
      label: `Stock ${input.delta > 0 ? '+' : ''}${input.delta} on "${updated.label}"`,
      description: `${previousStock} → ${newStock} (${input.reason})`,
      actor,
    });
  }

  /**
   * Decrements (or restores) stock for order lines — warehouse + FEFO lots + COGS.
   * Positive `sign` restores; negative consumes.
   */
  async applyOrderStockDeltas(
    tx: Tx,
    organizationId: string,
    lines: Array<{
      productId: string | null;
      variantId: string | null;
      quantity: number;
      productName: string;
    }>,
    options: {
      sign: 1 | -1;
      orderNumber: string;
      orderId?: string;
      actor?: Actor;
    },
  ): Promise<void> {
    for (const line of lines) {
      if (!line.productId || line.quantity <= 0) continue;

      let variantId = line.variantId ?? undefined;
      if (!variantId) {
        const first = await tx.productVariant.findFirst({
          where: { productId: line.productId, organizationId },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        if (!first) {
          throw new BadRequestException(
            `Product "${line.productName}" has no variants for stock movement`,
          );
        }
        variantId = first.id;
      }

      const note = `Order ${options.orderNumber} · ${line.productName}`;
      const sourceId = options.orderId ?? options.orderNumber;

      if (options.sign < 0) {
        await this.advanced.consumeStock(tx, organizationId, {
          productId: line.productId,
          variantId,
          quantity: line.quantity,
          preferFefo: true,
          reason: 'order_sale',
          note,
          sourceType: 'order',
          sourceId,
          actor: options.actor,
          journalKind: 'sale_cogs',
          journalEventKey: `sale-cogs:${sourceId}:${variantId}`,
          journalDescription: `COGS ${options.orderNumber} · ${line.productName}`,
        });
      } else {
        // Reverse COGS for restock — scale original sale_cogs by restocked qty.
        const saleKey = `sale-cogs:${sourceId}:${variantId}`;
        const saleJournal = await tx.accountingJournalEntry.findFirst({
          where: { organizationId, eventKey: saleKey },
          include: { lines: { select: { debit: true } } },
        });
        let unitCost: number | undefined;
        let journalAmount: number | undefined;
        if (saleJournal) {
          const originalAmount = saleJournal.lines.reduce(
            (max, l) => Math.max(max, Number(l.debit || 0)),
            0,
          );
          const soldLine = options.orderId
            ? await tx.orderItem.findFirst({
                where: {
                  orderId: options.orderId,
                  OR: [{ variantId }, { productId: line.productId }],
                },
                select: { quantity: true, returnedQuantity: true },
              })
            : null;
          const soldQty = Math.max(1, soldLine?.quantity ?? line.quantity);
          unitCost = originalAmount / soldQty;
          journalAmount = unitCost * line.quantity;
          const alreadyReturned = soldLine?.returnedQuantity ?? 0;
          // Lot numbers must be unique per variant — reuse after cancel/rebook/status
          // bounce used to fail with Prisma unique constraint on InventoryLot.
          const lotSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
          await this.advanced.receiveStock(tx, organizationId, {
            productId: line.productId,
            variantId,
            quantity: line.quantity,
            unitCost,
            createLot: true,
            lot: {
              lotNumber:
                `RST-${options.orderNumber}-${variantId.slice(0, 6)}-${alreadyReturned}+${line.quantity}-${lotSuffix}`.slice(
                  0,
                  64,
                ),
            },
            reason: 'order_restock',
            note,
            sourceType: 'order',
            sourceId,
            actor: options.actor,
            journalKind: 'sale_cogs_reversal',
            journalEventKey: `sale-cogs-rev:${sourceId}:${variantId}:from${alreadyReturned}:q${line.quantity}:${lotSuffix}`,
            journalDescription: `COGS reverse ${options.orderNumber} · ${line.productName}`,
            journalAmount,
          });
        } else {
          const lotSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
          await this.advanced.receiveStock(tx, organizationId, {
            productId: line.productId,
            variantId,
            quantity: line.quantity,
            createLot: true,
            lot: {
              lotNumber:
                `RST-${options.orderNumber}-${variantId.slice(0, 6)}-${line.quantity}-${lotSuffix}`.slice(
                  0,
                  64,
                ),
            },
            reason: 'order_restock',
            note,
            sourceType: 'order',
            sourceId,
            actor: options.actor,
            journalKind: 'sale_cogs_reversal',
            journalEventKey: `sale-cogs-rev:${sourceId}:${variantId}:q${line.quantity}`,
            journalDescription: `COGS reverse ${options.orderNumber} · ${line.productName}`,
          });
        }
      }
    }
  }

  // ─── Internal: lookups / validation ───────────────────────────────────────

  private async requireBrand(
    organizationId: string,
    id: string,
    options?: { currentBrandId?: string | null },
  ) {
    const row = await this.prisma.productBrand.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Brand not found');
    if (!row.isActive && options?.currentBrandId !== id) {
      throw new BadRequestException('Cannot assign an inactive brand');
    }
    return row;
  }

  /**
   * Resolves and validates a category assignment. Always enforces org
   * ownership and kind=product. Returns null only when clearing
   * (categoryId === null). Inactive categories are rejected for new
   * assignments but tolerated if the product is already in them.
   */
  private async resolveCategoryId(
    organizationId: string,
    options: {
      categoryId?: string | null;
      slug?: string;
      currentCategoryId?: string | null;
      fallbackToOther?: boolean;
    },
  ): Promise<string | null> {
    if (options.categoryId === null) return null;

    if (options.categoryId) {
      const row = await this.prisma.orgCategory.findFirst({
        where: {
          id: options.categoryId,
          organizationId,
          kind: 'product',
          deletedAt: null,
        },
      });
      if (!row) throw new BadRequestException('Invalid category');
      if (!row.isActive && options.currentCategoryId !== row.id) {
        throw new BadRequestException('Cannot assign an inactive category');
      }
      return row.id;
    }

    if (options.slug) {
      await this.ensureDefaultCategories(organizationId);
      const row = await this.prisma.orgCategory.findFirst({
        where: {
          organizationId,
          kind: 'product',
          slug: slugify(options.slug),
          deletedAt: null,
        },
      });
      if (!row) throw new BadRequestException('Invalid category');
      if (!row.isActive && options.currentCategoryId !== row.id) {
        throw new BadRequestException('Cannot assign an inactive category');
      }
      return row.id;
    }

    if (options.fallbackToOther) {
      await this.ensureDefaultCategories(organizationId);
      const fallback = await this.prisma.orgCategory.findFirst({
        where: { organizationId, kind: 'product', slug: 'other', deletedAt: null },
      });
      return fallback?.id ?? null;
    }

    return null;
  }

  private assertUniqueVariantSkus(skus: string[]): void {
    const normalized = skus.map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (normalized.length !== skus.length) {
      throw new BadRequestException('Every variant needs a SKU');
    }
    if (new Set(normalized).size !== normalized.length) {
      throw new BadRequestException('Variant SKUs must be unique');
    }
  }

  // ─── Internal: stock-status raw queries ───────────────────────────────────

  private async productIdsByStockStatus(
    organizationId: string,
    status: 'low_stock' | 'out_of_stock',
  ): Promise<string[]> {
    const sql =
      status === 'out_of_stock'
        ? Prisma.sql`
            SELECT p."id"
            FROM "Product" p
            LEFT JOIN "ProductVariant" v ON v."productId" = p."id"
            WHERE p."organizationId" = ${organizationId} AND p."deletedAt" IS NULL
            GROUP BY p."id"
            HAVING COALESCE(SUM(v."stock"), 0) <= 0
          `
        : Prisma.sql`
            SELECT p."id"
            FROM "Product" p
            LEFT JOIN "ProductVariant" v ON v."productId" = p."id"
            WHERE p."organizationId" = ${organizationId} AND p."deletedAt" IS NULL
            GROUP BY p."id", p."reorderLevel"
            HAVING COALESCE(SUM(v."stock"), 0) > 0
               AND COALESCE(SUM(v."stock"), 0) <= p."reorderLevel"
          `;
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(sql);
    return rows.map((row) => row.id);
  }

  private async buildSummary(organizationId: string): Promise<{
    summary: ProductListResponse['summary'];
    filters: ProductListResponse['filters'];
  }> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        count: number;
        lowStockCount: number;
        outOfStockCount: number;
        activeCount: number;
        totalStockValue: number;
      }>
    >(Prisma.sql`
      SELECT
        COUNT(*)::int AS "count",
        COALESCE(SUM(CASE WHEN s."stock" > 0 AND s."stock" <= s."reorderLevel" THEN 1 ELSE 0 END), 0)::int AS "lowStockCount",
        COALESCE(SUM(CASE WHEN s."stock" <= 0 THEN 1 ELSE 0 END), 0)::int AS "outOfStockCount",
        COALESCE(SUM(CASE WHEN s."status" = 'active' THEN 1 ELSE 0 END), 0)::int AS "activeCount",
        COALESCE(SUM(s."stockValue"), 0)::float AS "totalStockValue"
      FROM (
        SELECT
          p."id",
          p."status",
          p."reorderLevel",
          COALESCE(SUM(v."stock"), 0)::int AS "stock",
          COALESCE(SUM(v."stock" * COALESCE(v."costPrice", v."salePrice")), 0)::float AS "stockValue"
        FROM "Product" p
        LEFT JOIN "ProductVariant" v ON v."productId" = p."id"
        WHERE p."organizationId" = ${organizationId} AND p."deletedAt" IS NULL
        GROUP BY p."id"
      ) s
    `);

    const stats = rows[0] ?? {
      count: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      activeCount: 0,
      totalStockValue: 0,
    };

    return {
      summary: {
        count: stats.count,
        lowStockCount: stats.lowStockCount,
        outOfStockCount: stats.outOfStockCount,
        activeCount: stats.activeCount,
        totalStockValue: stats.totalStockValue,
      },
      filters: [
        { id: 'all', label: 'All', count: stats.count },
        { id: 'low_stock', label: 'Low stock', count: stats.lowStockCount },
        { id: 'out_of_stock', label: 'Out of stock', count: stats.outOfStockCount },
        { id: 'active', label: 'Active', count: stats.activeCount },
        { id: 'inactive', label: 'Inactive', count: stats.count - stats.activeCount },
      ],
    };
  }

  // ─── Internal: activity log ───────────────────────────────────────────────

  private async logActivity(
    tx: Tx,
    organizationId: string,
    entry: {
      entityType: 'brand' | 'category' | 'product' | 'variant';
      entityId: string;
      productId?: string;
      action: string;
      label: string;
      description?: string;
      actor?: Actor;
    },
  ): Promise<void> {
    await tx.catalogActivity.create({
      data: {
        organizationId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        productId: entry.productId ?? null,
        action: entry.action,
        label: entry.label,
        description: entry.description ?? null,
        actorUserId: entry.actor?.userId ?? null,
        actorName: entry.actor?.name ?? null,
      },
    });
  }

  // ─── Internal: mappers ────────────────────────────────────────────────────

  private toBrand(row: {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ProductBrand {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      slug: row.slug,
      description: row.description ?? undefined,
      isActive: row.isActive,
      deletedAt: row.deletedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toCategory(row: {
    id: string;
    organizationId: string;
    kind: string;
    slug: string;
    label: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    isSystem: boolean;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): OrgCategory {
    return {
      id: row.id,
      organizationId: row.organizationId,
      kind: row.kind as OrgCategoryKind,
      slug: row.slug,
      label: row.label,
      description: row.description ?? undefined,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      isSystem: row.isSystem,
      deletedAt: row.deletedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toListItem(row: ProductRow): InventoryProductListItem {
    const stock = row.variants.reduce((sum, v) => sum + v.stock, 0);
    const prices = row.variants.map((v) => toNumber(v.salePrice));
    const costs = row.variants
      .map((v) => toNullableNumber(v.costPrice))
      .filter((v): v is number => v != null);
    const salePriceMin = prices.length ? Math.min(...prices) : 0;
    const salePriceMax = prices.length ? Math.max(...prices) : 0;

    return {
      id: row.id,
      name: row.name,
      sku: row.sku,
      imageUrl: row.imageUrl ?? undefined,
      imageKey: row.imageKey ?? undefined,
      category: row.category?.slug ?? 'other',
      categoryId: row.categoryId ?? undefined,
      categoryLabel: row.category?.label,
      brandId: row.brandId ?? undefined,
      brandName: row.brand?.name,
      status: row.status as ProductStatus,
      stock,
      reorderLevel: row.reorderLevel,
      stockStatus: stockStatusFor(stock, row.reorderLevel),
      variantCount: row.variants.length,
      primaryVariantId: row.variants[0]?.id,
      primaryBaseUomCode: row.variants[0]?.baseUom?.code ?? undefined,
      salePriceMin,
      salePriceMax,
      costPrice: costs.length ? Math.min(...costs) : undefined,
      tags: row.tags,
      supplierName: row.supplierName ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      deletedAt: row.deletedAt?.toISOString(),
    };
  }

  private toDetail(row: ProductRow): InventoryProductDetail {
    const list = this.toListItem(row);
    const variants: ProductVariant[] = row.variants.map((v) => ({
      id: v.id,
      label: v.label,
      sku: v.sku,
      barcode: v.barcode ?? undefined,
      baseUomId: v.baseUomId ?? v.baseUom?.id ?? undefined,
      baseUomCode: v.baseUom?.code ?? undefined,
      baseUomName: v.baseUom?.name ?? undefined,
      salePrice: toNumber(v.salePrice),
      costPrice: toNullableNumber(v.costPrice) ?? undefined,
      stock: v.stock,
      reorderLevel: v.reorderLevel,
      weightKg: Number(v.weightKg ?? 0.5) > 0 ? Number(v.weightKg ?? 0.5) : 0.5,
    }));

    return {
      ...list,
      description: row.description ?? undefined,
      notes: row.notes ?? undefined,
      variants,
      activities: (row.activities ?? []).map((activity) => ({
        id: activity.id,
        label: activity.label,
        description: activity.description ?? undefined,
        timestamp: activity.createdAt.toISOString(),
        actorName: activity.actorName ?? undefined,
      })),
    };
  }
}
