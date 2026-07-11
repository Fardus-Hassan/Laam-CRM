import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { getMockDashboardForRole } from './data/dashboard-mocks';

import { Public } from '../common/decorators';

@ApiTags('CRM — Dashboard')
@Public()
@Controller('crm/dashboard')
export class DashboardController {
  @Get()
  @ApiOperation({ summary: 'Role-scoped dashboard payload (prototype fixtures)' })
  get(@Query('role') role = 'org_admin') {
    return getMockDashboardForRole(role);
  }
}
