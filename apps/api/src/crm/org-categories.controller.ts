import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import type { OrgCategoryKind, Permission } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import { PermissionResolverService } from '../common/permission-resolver.service';
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
  constructor(
    private readonly catalog: InventoryCatalogService,
    private readonly permissions: PermissionResolverService,
  ) {}

  private async assertAny(
    userId: string,
    required: Permission[],
  ): Promise<void> {
    const ok = await this.permissions.userHasPermission(userId, required, 'any');
    if (!ok) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  @Get()
  @RequirePermissions(
    'settings.manage',
    'settings.view',
    'inventory.view',
    'knowledge.view',
    'knowledge.manage',
  )
  async list(
    @CurrentUser() user: AuthUserPayload,
    @Query('kind') kind?: OrgCategoryKind,
  ) {
    this.catalog.requireOrg(user.organizationId);
    if (kind === 'knowledge') {
      await this.assertAny(user.userId, [
        'knowledge.view',
        'knowledge.manage',
        'settings.view',
        'settings.manage',
      ]);
    } else {
      await this.assertAny(user.userId, [
        'settings.view',
        'settings.manage',
        'inventory.view',
      ]);
    }
    return this.catalog.listCategories(user.organizationId, kind);
  }

  @Post()
  @RequirePermissions(
    'settings.manage',
    'inventory.create',
    'inventory.edit',
    'knowledge.manage',
  )
  async upsert(@CurrentUser() user: AuthUserPayload, @Body() body: UpsertCategoryDto) {
    this.catalog.requireOrg(user.organizationId);
    if (body.kind === 'knowledge') {
      await this.assertAny(user.userId, ['knowledge.manage', 'settings.manage']);
    } else {
      await this.assertAny(user.userId, [
        'settings.manage',
        'inventory.create',
        'inventory.edit',
      ]);
    }
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
  @RequirePermissions('settings.manage', 'inventory.edit', 'knowledge.manage')
  async setActive(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: SetActiveDto,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const existing = await this.catalog.getCategory(user.organizationId!, id);
    if (existing?.kind === 'knowledge') {
      await this.assertAny(user.userId, ['knowledge.manage', 'settings.manage']);
    } else {
      await this.assertAny(user.userId, ['settings.manage', 'inventory.edit']);
    }
    return this.catalog.setCategoryActive(user.organizationId, id, body.isActive);
  }

  @Delete(':id')
  @RequirePermissions('settings.manage', 'inventory.delete', 'knowledge.manage')
  async remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    const existing = await this.catalog.getCategory(user.organizationId!, id);
    if (existing?.kind === 'knowledge') {
      await this.assertAny(user.userId, ['knowledge.manage', 'settings.manage']);
    } else {
      await this.assertAny(user.userId, ['settings.manage', 'inventory.delete']);
    }
    await this.catalog.deleteCategory(user.organizationId!, id, actorFromUser(user));
    return { ok: true };
  }
}
