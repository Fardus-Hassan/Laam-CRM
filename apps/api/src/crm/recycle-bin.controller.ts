import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { RecycleBinItem, RecycleEntityType } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import { InventoryCatalogService } from './inventory-catalog.service';
import { OrdersService } from './orders.service';

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
  constructor(
    private readonly catalog: InventoryCatalogService,
    private readonly orders: OrdersService,
  ) {}

  private actor(user: AuthUserPayload) {
    return actorFromUser(user);
  }

  @Get()
  @RequirePermissions('recycle.view', 'recycle.manage')
  async list(@CurrentUser() user: AuthUserPayload, @Query() query: RecycleListQueryDto) {
    this.catalog.requireOrg(user.organizationId);
    const orgId = user.organizationId!;
    const items: RecycleBinItem[] = [];

    if (!query.entityType || query.entityType !== 'order') {
      items.push(
        ...(await this.catalog.listRecycleBin(orgId, {
          entityType: query.entityType,
          search: query.search,
        })),
      );
    }

    if (!query.entityType || query.entityType === 'order') {
      const deletedOrders = await this.orders.listDeletedForRecycleBin(orgId, query.search);
      for (const order of deletedOrders) {
        const deletedAt = order.deletedAt!;
        items.push({
          id: `order:${order.id}`,
          entityType: 'order',
          entityId: order.id,
          title: `#${order.orderNumber} · ${order.customerName}`,
          subtitle: `${order.customerPhone} · ${order.status}`,
          deletedBy: order.createdByName ?? 'Unknown',
          deletedAt: deletedAt.toISOString(),
          purgeAt: new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
    return items;
  }

  @Post(':id/restore')
  @RequirePermissions('recycle.manage', 'inventory.delete', 'orders.cancel')
  async restore(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    if (id.startsWith('order:')) {
      await this.orders.restoreDeleted(user.organizationId!, id.slice(6), this.actor(user));
      return { ok: true };
    }
    await this.catalog.restoreRecycleItem(user.organizationId!, id, this.actor(user));
    return { ok: true };
  }

  @Delete(':id')
  @RequirePermissions('recycle.manage', 'inventory.delete', 'orders.cancel')
  async purge(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.catalog.requireOrg(user.organizationId);
    if (id.startsWith('order:')) {
      await this.orders.purgeDeleted(user.organizationId!, id.slice(6));
      return { ok: true };
    }
    await this.catalog.purgeRecycleItem(user.organizationId!, id, this.actor(user));
    return { ok: true };
  }
}
