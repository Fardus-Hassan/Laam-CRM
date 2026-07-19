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
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { OrgCategoryKind } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { InventoryCatalogService } from './inventory-catalog.service';

class UpsertCategoryDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsIn(['product', 'income', 'expense', 'knowledge'])
  kind!: OrgCategoryKind;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}

class SetActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

@Controller('crm/settings/categories')
export class OrgCategoriesController {
  constructor(private readonly catalog: InventoryCatalogService) {}

  @Get()
  @RequirePermissions('settings.manage', 'settings.view', 'inventory.view')
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('kind') kind?: OrgCategoryKind,
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.catalog.listCategories(user.organizationId, kind);
  }

  @Post()
  @RequirePermissions('settings.manage', 'inventory.create', 'inventory.edit')
  upsert(@CurrentUser() user: AuthUserPayload, @Body() body: UpsertCategoryDto) {
    this.catalog.requireOrg(user.organizationId);
    return this.catalog.upsertCategory(user.organizationId, {
      id: body.id,
      kind: body.kind,
      label: body.label,
      slug: body.slug ?? body.label,
      description: body.description,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
      isSystem: body.isSystem ?? false,
    });
  }

  @Patch(':id/active')
  @RequirePermissions('settings.manage', 'inventory.edit')
  setActive(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: SetActiveDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    return this.catalog.setCategoryActive(user.organizationId, id, body.isActive);
  }

  @Delete(':id')
  @RequirePermissions('settings.manage', 'inventory.delete')
  async remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    await this.catalog.deleteCategory(user.organizationId!, id, {
      userId: user.userId,
      name: user.email,
    });
    return { ok: true };
  }
}
