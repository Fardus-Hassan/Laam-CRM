import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type {
  AdjustmentReason,
  CreatePurchasePayload,
  PurchasePaymentStatus,
} from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { InventoryCatalogService } from './inventory-catalog.service';
import { InventoryOperationsService } from './inventory-operations.service';

class PurchaseLineDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @IsString()
  @MinLength(1)
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost!: number;
}

class CreatePurchaseDto {
  @IsString()
  @MinLength(1)
  supplierId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  purchaseNumber!: string;

  @IsOptional()
  @IsIn(['unpaid', 'partial', 'paid'])
  paymentStatus?: PurchasePaymentStatus;

  @IsString()
  purchaseDate!: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineDto)
  lines!: PurchaseLineDto[];
}

class CreateAdjustmentDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @Type(() => Number)
  @IsInt()
  delta!: number;

  @IsIn([
    'damage',
    'expiry',
    'count_correction',
    'gift_sample',
    'theft_loss',
    'return_in',
    'other',
  ])
  reason!: AdjustmentReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

@Controller('crm/inventory')
export class InventoryOperationsController {
  constructor(
    private readonly operations: InventoryOperationsService,
    private readonly catalog: InventoryCatalogService,
  ) {}

  private actor(user: AuthUserPayload) {
    return { userId: user.userId, name: user.email };
  }

  @Get('suppliers')
  @RequirePermissions('inventory.view', 'inventory.purchase')
  listSuppliers(@CurrentUser() user: AuthUserPayload, @Query('search') search?: string) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.listSuppliers(user.organizationId!, search);
  }

  @Get('purchases')
  @RequirePermissions('inventory.view', 'inventory.purchase')
  listPurchases(@CurrentUser() user: AuthUserPayload, @Query('search') search?: string) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.listPurchases(user.organizationId!, search);
  }

  @Post('purchases')
  @RequirePermissions('inventory.purchase')
  createPurchase(@CurrentUser() user: AuthUserPayload, @Body() body: CreatePurchaseDto) {
    this.catalog.requireOrg(user.organizationId);
    const payload: CreatePurchasePayload = {
      supplierId: body.supplierId,
      purchaseNumber: body.purchaseNumber,
      paymentStatus: body.paymentStatus ?? 'unpaid',
      purchaseDate: body.purchaseDate,
      dueDate: body.dueDate,
      notes: body.notes,
      lines: body.lines,
    };
    return this.operations.createPurchase(user.organizationId!, payload);
  }

  @Post('purchases/:id/receive')
  @RequirePermissions('inventory.purchase', 'inventory.adjust')
  receivePurchase(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.receivePurchase(user.organizationId!, id, this.actor(user));
  }

  @Get('adjustments')
  @RequirePermissions('inventory.view', 'inventory.adjust')
  listAdjustments(@CurrentUser() user: AuthUserPayload) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.listAdjustments(user.organizationId!);
  }

  @Post('adjustments')
  @RequirePermissions('inventory.adjust')
  async createAdjustment(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: CreateAdjustmentDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    await this.operations.createAdjustment(user.organizationId!, body, this.actor(user));
    return { ok: true };
  }
}
