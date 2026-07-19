import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { InventoryCatalogService } from './inventory-catalog.service';

class CreateBrandDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Controller('crm/inventory/brands')
export class ProductBrandsController {
  constructor(private readonly catalog: InventoryCatalogService) {}

  @Get()
  @RequirePermissions('inventory.view')
  list(@CurrentUser() user: AuthUserPayload) {
    this.catalog.requireOrg(user.organizationId);
    return this.catalog.listBrands(user.organizationId);
  }

  @Post()
  @RequirePermissions('inventory.create', 'inventory.edit')
  create(@CurrentUser() user: AuthUserPayload, @Body() body: CreateBrandDto) {
    this.catalog.requireOrg(user.organizationId);
    return this.catalog.createBrand(user.organizationId, body);
  }

  @Patch(':id')
  @RequirePermissions('inventory.edit')
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateBrandDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.catalog.updateBrand(user.organizationId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('inventory.delete')
  async remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    await this.catalog.deleteBrand(user.organizationId!, id, {
      userId: user.userId,
      name: user.email,
    });
    return { ok: true };
  }
}
