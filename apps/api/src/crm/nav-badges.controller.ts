import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { AccountingService } from './accounting.service';
import { CourierHubService } from './courier-hub.service';
import { FailedOrdersService } from './failed-orders.service';
import { FollowupsService } from './followups.service';
import { InventoryCatalogService } from './inventory-catalog.service';
import { SupportService } from './support.service';
import { TasksService } from './tasks.service';

@ApiTags('CRM — Navigation')
@Controller('crm/nav')
export class NavBadgesController {
  constructor(
    private readonly courierHub: CourierHubService,
    private readonly followups: FollowupsService,
    private readonly tasks: TasksService,
    private readonly accounting: AccountingService,
    private readonly inventory: InventoryCatalogService,
    private readonly support: SupportService,
    private readonly failedOrders: FailedOrdersService,
  ) {}

  @Get('badges')
  @RequirePermissions('orders.view', 'courier.view', 'courier.manage')
  @ApiOperation({ summary: 'Sidebar badge counts' })
  async badges(@CurrentUser() user: AuthUserPayload) {
    const orgId = user.organizationId;
    if (!orgId) {
      return {
        followups: 0,
        tasks: 0,
        receivables: 0,
        blocked: 0,
        courier: 0,
        support: 0,
        lowStock: 0,
      };
    }

    const [
      followups,
      tasks,
      receivables,
      blocked,
      courier,
      support,
      lowStock,
    ] = await Promise.all([
      this.followups.todayDueCount(orgId).catch(() => 0),
      this.tasks.todayOpenCount(orgId).catch(() => 0),
      this.accounting.openReceivablesCount(orgId).catch(() => 0),
      this.failedOrders.countPending(orgId).catch(() => 0),
      this.courierHub.readyCount(orgId).catch(() => 0),
      this.support.openCount(orgId).catch(() => 0),
      this.inventory.lowStockCount(orgId).catch(() => 0),
    ]);

    return {
      followups,
      tasks,
      receivables,
      blocked,
      courier,
      support,
      lowStock,
    };
  }
}
