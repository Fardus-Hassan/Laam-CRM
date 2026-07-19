import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type {
  CreateWarehousePayload,
  TransferStockPayload,
  UpdateWarehousePayload,
} from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { InventoryAdvancedService } from './inventory-advanced.service';
import { InventoryCatalogService } from './inventory-catalog.service';

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
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

@Controller('crm/inventory')
export class InventoryAdvancedController {
  constructor(
    private readonly advanced: InventoryAdvancedService,
    private readonly catalog: InventoryCatalogService,
  ) {}

  private actor(user: AuthUserPayload) {
    return { userId: user.userId, name: user.email };
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
      pageSize: Math.min(100, Math.max(1, Number(pageSizeRaw) || 50)),
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
  @RequirePermissions('inventory.edit')
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
  @RequirePermissions('inventory.edit')
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
  ) {
    this.catalog.requireOrg(user.organizationId);
    const expiringWithinDays = expiringWithinDaysRaw
      ? Math.max(1, Number(expiringWithinDaysRaw) || 60)
      : undefined;
    return this.advanced.listLots(user.organizationId!, { expiringWithinDays });
  }

  @Get('reconciliation')
  @RequirePermissions('inventory.view')
  getReconciliation(@CurrentUser() user: AuthUserPayload) {
    this.catalog.requireOrg(user.organizationId);
    return this.advanced.getReconciliation(user.organizationId!);
  }
}
