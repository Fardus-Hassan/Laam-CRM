import { Controller, Get, Query } from '@nestjs/common';
import type { InventoryReportsQuery } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { InventoryCatalogService } from './inventory-catalog.service';
import { InventoryReportsService } from './inventory-reports.service';

@Controller('crm/inventory')
export class InventoryReportsController {
  constructor(
    private readonly reports: InventoryReportsService,
    private readonly catalog: InventoryCatalogService,
  ) {}

  @Get('reports')
  @RequirePermissions('inventory.view')
  getReports(
    @CurrentUser() user: AuthUserPayload,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    this.catalog.requireOrg(user.organizationId);
    const query: InventoryReportsQuery = {
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    };
    return this.reports.getDashboard(user.organizationId!, query);
  }
}
