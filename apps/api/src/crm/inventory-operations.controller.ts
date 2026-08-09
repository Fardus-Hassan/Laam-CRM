import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type {
  AdjustmentReason,
  CreateMixerRecipePayload,
  CreatePurchasePayload,
  CreatePurchaseReturnPayload,
  CreateSupplierPayload,
  PurchasePaymentStatus,
  ReceivePurchasePayload,
  UpdateMixerRecipePayload,
  UpdatePurchasePayload,
  UpdateSupplierPayload,
} from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
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
  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsString()
  uomId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  uomCode?: string;
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

class CreateSupplierDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactPerson?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  phone!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];
}

class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '' && value != null)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];
}

class UpdatePurchasePaymentDto {
  @IsIn(['unpaid', 'partial', 'paid'])
  paymentStatus!: PurchasePaymentStatus;
}

class UpdatePurchaseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  purchaseNumber?: string;

  @IsOptional()
  @IsIn(['unpaid', 'partial', 'paid'])
  paymentStatus?: PurchasePaymentStatus;

  @IsOptional()
  @IsString()
  purchaseDate?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  dueDate?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineDto)
  lines?: PurchaseLineDto[];
}

class ReceivePurchaseLineDto {
  @IsString()
  @MinLength(1)
  lineId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

class ReceivePurchaseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  warehouseId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseLineDto)
  lines?: ReceivePurchaseLineDto[];
}

class MixerRecipeInputDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  unit!: string;

  @IsOptional()
  @IsString()
  uomId?: string;
}

class CreateMixerRecipeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1)
  outputProductId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  outputQty!: number;

  @IsOptional()
  @IsIn(['active', 'draft'])
  status?: 'active' | 'draft';

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => MixerRecipeInputDto)
  inputs!: MixerRecipeInputDto[];
}

class UpdateMixerRecipeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  outputProductId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  outputQty?: number;

  @IsOptional()
  @IsIn(['active', 'draft'])
  status?: 'active' | 'draft';

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => MixerRecipeInputDto)
  inputs?: MixerRecipeInputDto[];
}

class CreateAdjustmentDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @Type(() => Number)
  @IsNumber()
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
  variantId?: string;

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

class PurchaseReturnLineDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @IsString()
  @MinLength(1)
  variantId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsString()
  uomId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  uomCode?: string;
}

class CreatePurchaseReturnDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  returnNumber!: string;

  @IsOptional()
  @IsString()
  purchaseId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  purchaseNumber!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  supplierName!: string;

  @IsString()
  returnDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PurchaseReturnLineDto)
  lines!: PurchaseReturnLineDto[];
}

class ProductionRawMaterialDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  unit!: string;

  @IsOptional()
  @IsString()
  uomId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalCost!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPerKg!: number;
}

class ProductionOutputLineDto {
  @IsString()
  @MinLength(1)
  variantId!: string;

  @IsString()
  @MinLength(1)
  variantLabel!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  gramsPerUnit!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  units!: number;
}

class RunProductionDto {
  @IsString()
  @MinLength(1)
  outputProductId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProductionRawMaterialDto)
  rawMaterials!: ProductionRawMaterialDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProductionOutputLineDto)
  outputs!: ProductionOutputLineDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

@Controller('crm/inventory')
export class InventoryOperationsController {
  constructor(
    private readonly operations: InventoryOperationsService,
    private readonly catalog: InventoryCatalogService,
  ) {}

  private actor(user: AuthUserPayload) {
    return actorFromUser(user);
  }

  @Get('suppliers')
  @RequirePermissions('inventory.view', 'inventory.purchase')
  listSuppliers(
    @CurrentUser() user: AuthUserPayload,
    @Query('search') search?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.listSuppliers(user.organizationId!, {
      search,
      page: Math.max(1, Number(pageRaw) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSizeRaw) || 50)),
    });
  }

  @Post('suppliers')
  @RequirePermissions('inventory.purchase')
  createSupplier(@CurrentUser() user: AuthUserPayload, @Body() body: CreateSupplierDto) {
    this.catalog.requireOrg(user.organizationId);
    const payload: CreateSupplierPayload = {
      name: body.name,
      contactPerson: body.contactPerson,
      phone: body.phone,
      email: body.email,
      address: body.address,
      status: body.status ?? 'active',
      tags: body.tags,
    };
    return this.operations.createSupplier(user.organizationId!, payload);
  }

  @Patch('suppliers/:id')
  @RequirePermissions('inventory.purchase')
  updateSupplier(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateSupplierDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const payload: UpdateSupplierPayload = {
      name: body.name,
      contactPerson: body.contactPerson,
      phone: body.phone,
      email: body.email,
      address: body.address,
      status: body.status,
      tags: body.tags,
    };
    return this.operations.updateSupplier(user.organizationId!, id, payload);
  }

  @Delete('suppliers/:id')
  @RequirePermissions('inventory.purchase')
  async deleteSupplier(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    await this.operations.deleteSupplier(user.organizationId!, id);
    return { ok: true };
  }

  @Get('purchases')
  @RequirePermissions('inventory.view', 'inventory.purchase')
  listPurchases(
    @CurrentUser() user: AuthUserPayload,
    @Query('search') search?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('stockStatus') stockStatus?: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.listPurchases(user.organizationId!, {
      search,
      stockStatus,
      page: Math.max(1, Number(pageRaw) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSizeRaw) || 50)),
    });
  }

  @Get('purchases/:id')
  @RequirePermissions('inventory.view', 'inventory.purchase')
  getPurchase(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.getPurchase(user.organizationId!, id);
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

  @Patch('purchases/:id')
  @RequirePermissions('inventory.purchase')
  updatePurchase(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdatePurchaseDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const payload: UpdatePurchasePayload = {
      supplierId: body.supplierId,
      purchaseNumber: body.purchaseNumber,
      paymentStatus: body.paymentStatus,
      purchaseDate: body.purchaseDate,
      dueDate: body.dueDate,
      notes: body.notes,
      lines: body.lines,
    };
    return this.operations.updatePurchase(user.organizationId!, id, payload);
  }

  @Patch('purchases/:id/payment-status')
  @RequirePermissions('inventory.purchase')
  updatePurchasePayment(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdatePurchasePaymentDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.updatePurchasePayment(
      user.organizationId!,
      id,
      body.paymentStatus,
    );
  }

  @Post('purchases/:id/cancel')
  @RequirePermissions('inventory.purchase')
  cancelPurchase(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.cancelPurchase(user.organizationId!, id);
  }

  @Post('purchases/:id/receive')
  @RequirePermissions('inventory.purchase')
  receivePurchase(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: ReceivePurchaseDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const payload: ReceivePurchasePayload = {
      warehouseId: body.warehouseId,
      lines: body.lines,
    };
    return this.operations.receivePurchase(
      user.organizationId!,
      id,
      payload,
      this.actor(user),
    );
  }

  @Get('adjustments')
  @RequirePermissions('inventory.view', 'inventory.adjust')
  listAdjustments(
    @CurrentUser() user: AuthUserPayload,
    @Query('search') search?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.listAdjustments(user.organizationId!, {
      search,
      page: Math.max(1, Number(pageRaw) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSizeRaw) || 50)),
    });
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

  @Get('purchase-returns')
  @RequirePermissions('inventory.view', 'inventory.purchase')
  listPurchaseReturns(
    @CurrentUser() user: AuthUserPayload,
    @Query('search') search?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.listPurchaseReturns(user.organizationId!, {
      search,
      page: Math.max(1, Number(pageRaw) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSizeRaw) || 50)),
    });
  }

  @Get('purchase-returns/:id')
  @RequirePermissions('inventory.view', 'inventory.purchase')
  getPurchaseReturn(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.getPurchaseReturn(user.organizationId!, id);
  }

  @Post('purchase-returns')
  @RequirePermissions('inventory.purchase')
  createPurchaseReturn(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: CreatePurchaseReturnDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const payload: CreatePurchaseReturnPayload = {
      returnNumber: body.returnNumber,
      purchaseId: body.purchaseId,
      purchaseNumber: body.purchaseNumber,
      supplierName: body.supplierName,
      returnDate: body.returnDate,
      reason: body.reason,
      lines: body.lines,
    };
    return this.operations.createPurchaseReturn(user.organizationId!, payload);
  }

  @Post('purchase-returns/:id/approve')
  @RequirePermissions('inventory.purchase')
  approvePurchaseReturn(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.approvePurchaseReturn(user.organizationId!, id);
  }

  @Post('purchase-returns/:id/reject')
  @RequirePermissions('inventory.purchase')
  rejectPurchaseReturn(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.rejectPurchaseReturn(user.organizationId!, id);
  }

  @Post('purchase-returns/:id/complete')
  @RequirePermissions('inventory.purchase')
  async completePurchaseReturn(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    await this.operations.completePurchaseReturn(
      user.organizationId!,
      id,
      this.actor(user),
    );
    return { ok: true };
  }

  @Get('mixer')
  @RequirePermissions('inventory.view')
  listMixerRecipes(
    @CurrentUser() user: AuthUserPayload,
    @Query('search') search?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.listMixerRecipes(user.organizationId!, {
      search,
      page: Math.max(1, Number(pageRaw) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSizeRaw) || 25)),
    });
  }

  @Post('mixer')
  @RequirePermissions('inventory.mixer')
  createMixerRecipe(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: CreateMixerRecipeDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const payload: CreateMixerRecipePayload = {
      name: body.name,
      outputProductId: body.outputProductId,
      outputQty: body.outputQty,
      status: body.status ?? 'draft',
      inputs: body.inputs,
    };
    return this.operations.createMixerRecipe(user.organizationId!, payload);
  }

  @Patch('mixer/:id')
  @RequirePermissions('inventory.mixer')
  updateMixerRecipe(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateMixerRecipeDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const payload: UpdateMixerRecipePayload = {
      name: body.name,
      outputProductId: body.outputProductId,
      outputQty: body.outputQty,
      status: body.status,
      inputs: body.inputs,
    };
    return this.operations.updateMixerRecipe(user.organizationId!, id, payload);
  }

  @Delete('mixer/:id')
  @RequirePermissions('inventory.mixer')
  async deleteMixerRecipe(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    await this.operations.deleteMixerRecipe(user.organizationId!, id);
    return { ok: true };
  }

  @Get('mixer/runs')
  @RequirePermissions('inventory.view')
  listProductionRuns(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.listProductionRuns(user.organizationId!, {
      page: Math.max(1, Number(pageRaw) || 1),
      pageSize: Math.min(100, Math.max(1, Number(pageSizeRaw) || 25)),
    });
  }

  @Post('mixer/preview')
  @RequirePermissions('inventory.mixer')
  previewProduction(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: RunProductionDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.previewProduction(user.organizationId!, body);
  }

  @Post('mixer/run')
  @RequirePermissions('inventory.mixer')
  runProduction(@CurrentUser() user: AuthUserPayload, @Body() body: RunProductionDto) {
    this.catalog.requireOrg(user.organizationId);
    return this.operations.runProduction(user.organizationId!, body, this.actor(user));
  }
}
