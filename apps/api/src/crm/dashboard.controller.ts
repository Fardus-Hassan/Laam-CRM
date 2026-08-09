import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { getMockDashboardForRole } from './data/dashboard-mocks';

import { RequirePermissions } from '../common/decorators';

@ApiTags('CRM — Dashboard')
@Controller('crm/dashboard')
export class DashboardController {
  @Get()
  @RequirePermissions('dashboard.view')
  @ApiOperation({ summary: 'Role-scoped dashboard payload (prototype fixtures)' })
  get(@Query('role') role = 'org_admin') {
    return getMockDashboardForRole(role);
  }
}
