import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { memoryStorage } from 'multer';
import type { ProductFilter, ProductStatus } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import { InventoryCatalogService } from './inventory-catalog.service';
import { ObjectStorageService } from './object-storage.service';

class VariantDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  sku!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  salePrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  costPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  stock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  reorderLevel?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(1000)
  weightKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  baseUomId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  baseUomCode?: string;
}

class StockAdjustmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  delta!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  reason!: string;

  @IsString()
  @MinLength(1)
  variantId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  sku!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'discontinued'])
  status?: ProductStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants!: VariantDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];
}

class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  brandId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageUrl?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'discontinued'])
  status?: ProductStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  /** @deprecated Prefer POST :id/stock-adjust */
  @IsOptional()
  @ValidateNested()
  @Type(() => StockAdjustmentDto)
  stockAdjustment?: StockAdjustmentDto;
}

class BulkProductDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  productIds!: string[];

  @IsOptional()
  @IsIn(['active', 'inactive', 'discontinued'])
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stockDelta?: number;
}

@Controller('crm/inventory/products')
export class ProductsController {
  constructor(
    private readonly catalog: InventoryCatalogService,
    private readonly storage: ObjectStorageService,
  ) {}

  private actor(user: AuthUserPayload) {
    return actorFromUser(user);
  }

  private mapVariants(variants: VariantDto[]) {
    return variants.map((v) => ({
      id: v.id ?? `tmp-${v.sku}`,
      label: v.label,
      sku: v.sku,
      barcode: v.barcode?.trim() || undefined,
      baseUomId: v.baseUomId,
      baseUomCode: v.baseUomCode?.trim() || undefined,
      salePrice: v.salePrice,
      costPrice: v.costPrice,
      stock: v.stock ?? 0,
      reorderLevel: v.reorderLevel ?? 5,
      weightKg:
        v.weightKg != null && Number(v.weightKg) > 0 ? Number(v.weightKg) : 0.5,
    }));
  }

  @Get()
  @RequirePermissions('inventory.view')
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('filter') filter?: ProductFilter,
    @Query('category') category?: string,
    @Query('brandId') brandId?: string,
    @Query('search') search?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const page = Math.max(1, Number(pageRaw) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw) || 20));
    return this.catalog.listProducts(user.organizationId!, {
      filter,
      category,
      brandId,
      search,
      page,
      pageSize,
    });
  }

  @Post('bulk')
  @RequirePermissions('inventory.edit')
  bulk(@CurrentUser() user: AuthUserPayload, @Body() body: BulkProductDto) {
    this.catalog.requireOrg(user.organizationId);
    return this.catalog.bulkProductAction(user.organizationId!, body, this.actor(user));
  }

  @Post('repair-warehouse-stock')
  @RequirePermissions('inventory.adjust')
  repairWarehouseStock(@CurrentUser() user: AuthUserPayload) {
    this.catalog.requireOrg(user.organizationId);
    return this.catalog.repairOrgWarehouseStockGaps(
      user.organizationId!,
      this.actor(user),
    );
  }

  @Get(':id/stock-movements')
  @RequirePermissions('inventory.view')
  listMovements(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const page = Math.max(1, Number(pageRaw) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw) || 20));
    return this.catalog.listStockMovements(user.organizationId!, id, { page, pageSize });
  }

  @Get(':id/activities')
  @RequirePermissions('inventory.view')
  listActivities(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const page = Math.max(1, Number(pageRaw) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw) || 10));
    return this.catalog.listProductActivities(user.organizationId!, id, { page, pageSize });
  }

  @Post(':id/stock-adjust')
  @RequirePermissions('inventory.adjust')
  adjustStock(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: StockAdjustmentDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.catalog.adjustStock(
      user.organizationId!,
      id,
      {
        variantId: body.variantId,
        delta: body.delta,
        reason: body.reason,
        note: body.note,
      },
      this.actor(user),
    );
  }

  @Post(':id/image')
  @RequirePermissions('inventory.edit')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })],
      }),
    )
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ) {
    this.catalog.requireOrg(user.organizationId);
    await this.catalog.getProduct(user.organizationId!, id);
    const uploaded = await this.storage.uploadProductImage(user.organizationId!, id, file);
    return this.catalog.updateProduct(
      user.organizationId!,
      id,
      { imageUrl: uploaded.url, imageKey: uploaded.key },
      this.actor(user),
    );
  }

  @Post(':id/restore')
  @RequirePermissions('inventory.delete')
  restore(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    return this.catalog.restoreProduct(user.organizationId!, id, this.actor(user));
  }

  @Get(':id')
  @RequirePermissions('inventory.view', 'inventory.delete', 'recycle.view', 'recycle.manage')
  getOne(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const withDeleted = includeDeleted === 'true' || includeDeleted === '1';
    return this.catalog.getProduct(user.organizationId!, id, {
      includeDeleted: withDeleted,
    });
  }

  @Post()
  @RequirePermissions('inventory.create')
  create(@CurrentUser() user: AuthUserPayload, @Body() body: CreateProductDto) {
    this.catalog.requireOrg(user.organizationId);
    return this.catalog.createProduct(
      user.organizationId!,
      {
        ...body,
        // CreateProductPayload has zod defaults for these, so they are
        // required on the type; mirror the defaults here.
        status: body.status ?? 'active',
        reorderLevel: body.reorderLevel ?? 5,
        variants: this.mapVariants(body.variants),
      },
      this.actor(user),
    );
  }

  @Patch(':id')
  @RequirePermissions('inventory.edit')
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.catalog.updateProduct(
      user.organizationId!,
      id,
      {
        ...body,
        variants: body.variants ? this.mapVariants(body.variants) : undefined,
      },
      this.actor(user),
    );
  }

  @Delete(':id')
  @RequirePermissions('inventory.delete')
  async remove(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Query('hard') hard?: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    if (hard === 'true' || hard === '1') {
      await this.catalog.hardDeleteProduct(user.organizationId!, id, this.actor(user));
    } else {
      await this.catalog.softDeleteProduct(user.organizationId!, id, this.actor(user));
    }
    return { ok: true };
  }
}
