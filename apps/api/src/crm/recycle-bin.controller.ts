import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { RecycleEntityType } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { InventoryCatalogService } from './inventory-catalog.service';

class RecycleListQueryDto {
  @IsOptional()
  @IsIn(['order', 'customer', 'product', 'brand', 'category', 'lead', 'contact'])
  entityType?: RecycleEntityType;

  @IsOptional()
  @IsString()
  search?: string;
}

@Controller('crm/recycle-bin')
export class RecycleBinController {
  constructor(private readonly catalog: InventoryCatalogService) {}

  private actor(user: AuthUserPayload) {
    return { userId: user.userId, name: user.email };
  }

  @Get()
  @RequirePermissions('recycle.view', 'recycle.manage')
  list(@CurrentUser() user: AuthUserPayload, @Query() query: RecycleListQueryDto) {
    this.catalog.requireOrg(user.organizationId);
    return this.catalog.listRecycleBin(user.organizationId!, {
      entityType: query.entityType,
      search: query.search,
    });
  }

  @Post(':id/restore')
  @RequirePermissions('recycle.manage', 'inventory.delete')
  async restore(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    await this.catalog.restoreRecycleItem(user.organizationId!, id, this.actor(user));
    return { ok: true };
  }

  @Delete(':id')
  @RequirePermissions('recycle.manage', 'inventory.delete')
  async purge(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    await this.catalog.purgeRecycleItem(user.organizationId!, id, this.actor(user));
    return { ok: true };
  }
}
