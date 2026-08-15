import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type {
  CreateUnitOfMeasurePayload,
  CreateWarehousePayload,
  TransferStockPayload,
  UpdateInventoryLotPayload,
  UpdateUnitOfMeasurePayload,
  UpdateWarehousePayload,
  UomDimension,
} from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import { InventoryAdvancedService } from './inventory-advanced.service';
import { InventoryCatalogService } from './inventory-catalog.service';
import { InventoryUomService } from './inventory-uom.service';

const UOM_DIMENSIONS = ['count', 'mass', 'volume', 'length', 'area', 'other'] as const;

class CreateWarehouseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class TransferStockDto {
  @IsString()
  fromWarehouseId!: string;

  @IsString()
  toWarehouseId!: string;

  @IsString()
  productId!: string;

  @IsString()
  variantId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @IsOptional()
  @IsString()
  uomId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  uomCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class CreateUnitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsIn(UOM_DIMENSIONS)
  dimension?: UomDimension;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  factorToDimensionBase?: number;
}

class UpdateUnitDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(UOM_DIMENSIONS)
  dimension?: UomDimension;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  factorToDimensionBase?: number;
}

class UpdateLotDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsIn(['active', 'quarantined', 'expired', 'depleted'])
  status?: 'active' | 'quarantined' | 'expired' | 'depleted';

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  barcode?: string | null;
}

@Controller('crm/inventory')
export class InventoryAdvancedController {
  constructor(
    private readonly advanced: InventoryAdvancedService,
    private readonly catalog: InventoryCatalogService,
    private readonly uom: InventoryUomService,
  ) {}

  private actor(user: AuthUserPayload) {
    return actorFromUser(user);
  }

  @Get('units')
  @RequirePermissions('inventory.view')
  listUnits(@CurrentUser() user: AuthUserPayload) {
    this.catalog.requireOrg(user.organizationId);
    return this.uom.listUnits(user.organizationId!);
  }

  @Post('units')
  @RequirePermissions('inventory.edit', 'settings.manage')
  createUnit(@CurrentUser() user: AuthUserPayload, @Body() body: CreateUnitDto) {
    this.catalog.requireOrg(user.organizationId);
    const payload: CreateUnitOfMeasurePayload = {
      code: body.code,
      name: body.name,
      dimension: body.dimension ?? 'count',
      factorToDimensionBase: body.factorToDimensionBase ?? 1,
    };
    return this.uom.createUnit(user.organizationId!, payload);
  }

  @Patch('units/:id')
  @RequirePermissions('inventory.edit', 'settings.manage')
  updateUnit(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateUnitDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const payload: UpdateUnitOfMeasurePayload = {
      code: body.code,
      name: body.name,
      dimension: body.dimension,
      factorToDimensionBase: body.factorToDimensionBase,
    };
    return this.uom.updateUnit(user.organizationId!, id, payload);
  }

  @Delete('units/:id')
  @RequirePermissions('inventory.edit', 'settings.manage')
  async deleteUnit(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    await this.uom.deleteUnit(user.organizationId!, id);
    return { ok: true };
  }

  @Get('stock-movements')
  @RequirePermissions('inventory.view')
  listStockMovements(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('productId') productId?: string,
    @Query('variantId') variantId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('reason') reason?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('direction') direction?: 'in' | 'out',
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.advanced.listOrgStockMovements(user.organizationId!, {
      page: Math.max(1, Number(pageRaw) || 1),
      pageSize: Math.min(1000, Math.max(1, Number(pageSizeRaw) || 50)),
      productId,
      variantId,
      warehouseId,
      reason,
      search,
      dateFrom,
      dateTo,
      direction,
    });
  }

  @Get('warehouses')
  @RequirePermissions('inventory.view')
  listWarehouses(@CurrentUser() user: AuthUserPayload) {
    this.catalog.requireOrg(user.organizationId);
    return this.advanced.listWarehouses(user.organizationId!);
  }

  @Post('warehouses')
  @RequirePermissions('inventory.warehouses')
  createWarehouse(@CurrentUser() user: AuthUserPayload, @Body() body: CreateWarehouseDto) {
    this.catalog.requireOrg(user.organizationId);
    const payload: CreateWarehousePayload = {
      code: body.code,
      name: body.name,
      address: body.address,
      isDefault: body.isDefault,
    };
    return this.advanced.createWarehouse(user.organizationId!, payload);
  }

  @Patch('warehouses/:id')
  @RequirePermissions('inventory.warehouses')
  updateWarehouse(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateWarehouseDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const payload: UpdateWarehousePayload = {
      code: body.code,
      name: body.name,
      address: body.address,
      isDefault: body.isDefault,
      isActive: body.isActive,
    };
    return this.advanced.updateWarehouse(user.organizationId!, id, payload);
  }

  @Post('warehouses/transfer')
  @RequirePermissions('inventory.adjust')
  async transferStock(@CurrentUser() user: AuthUserPayload, @Body() body: TransferStockDto) {
    this.catalog.requireOrg(user.organizationId);
    const payload: TransferStockPayload = {
      fromWarehouseId: body.fromWarehouseId,
      toWarehouseId: body.toWarehouseId,
      productId: body.productId,
      variantId: body.variantId,
      quantity: body.quantity,
      uomId: body.uomId,
      uomCode: body.uomCode,
      note: body.note,
    };
    await this.advanced.transferStock(user.organizationId!, payload, this.actor(user));
    return { ok: true };
  }

  @Get('lots')
  @RequirePermissions('inventory.view')
  listLots(
    @CurrentUser() user: AuthUserPayload,
    @Query('expiringWithinDays') expiringWithinDaysRaw?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('fefo') fefoRaw?: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const expiringWithinDays = expiringWithinDaysRaw
      ? Math.max(1, Number(expiringWithinDaysRaw) || 60)
      : undefined;
    return this.advanced.listLots(user.organizationId!, {
      expiringWithinDays,
      status,
      search,
      fefo: fefoRaw === '1' || fefoRaw === 'true',
      page: Math.max(1, Number(pageRaw) || 1),
      pageSize: Math.min(1000, Math.max(1, Number(pageSizeRaw) || 50)),
    });
  }

  @Patch('lots/:id')
  @RequirePermissions('inventory.adjust')
  updateLot(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateLotDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const payload: UpdateInventoryLotPayload = {
      expiresAt: body.expiresAt,
      status: body.status,
      barcode: body.barcode,
    };
    return this.advanced.updateLot(user.organizationId!, id, payload);
  }

  @Get('reconciliation')
  @RequirePermissions('inventory.view')
  getReconciliation(@CurrentUser() user: AuthUserPayload) {
    this.catalog.requireOrg(user.organizationId);
    return this.advanced.getReconciliation(user.organizationId!);
  }

  @Post('reconciliation/adjust')
  @RequirePermissions('inventory.adjust')
  postReconciliationAdjust(@CurrentUser() user: AuthUserPayload) {
    this.catalog.requireOrg(user.organizationId);
    return this.advanced.postReconciliationAdjust(
      user.organizationId!,
      this.actor(user),
    );
  }
}
